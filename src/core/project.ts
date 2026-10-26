// Project: the registry an art file fills in, plus the lazy, cached, cycle-checked resolver.
import { type BuildCtx, type BuildOut, animTimeline, buildAsset, drawnFrames, gcd } from "./build.ts";
import { type Canvas, OPS } from "./canvas.ts";
import { type RigDef, drawGuide, drawParts, figure, ik, readRig, turnRig } from "./rig.ts";
import { type View, perspective } from "./perspective.ts";
import { solid } from "./solids.ts";
import { model, turnFaces, turnPoint } from "./mesh.ts";
import { Sdf, compile, sdf } from "./sdf.ts";
import { COMPASS, clocksOf, headingsOf, mirrorSymmetric, turnLight, turnViews } from "./turnaround.ts";
import { BLOCK_MATS, type Body, type Joints, type Pose, blocksOf, bodyOf, gait, ik3, jointsOf, partsOf } from "./rig3d.ts";
import { SURFACE_OPTS, VOXEL_OPTS, surfaceSize } from "./surface.ts";
import { Mesh3, Voxels, surfaceNets, voxelize } from "./grids.ts";
import { VOLUME_OPTS } from "./volume.ts";
import { SPLAT_OPTS, Splats, makeSplats } from "./splats.ts";
import { scatter } from "./scatter.ts";
import { DECAL_OPTS } from "./decal.ts";
import { BUILDERS, type Built, defineBuilder } from "./builders.ts";
import { DRAW3D_OPTS, type Rule, World, runExpects } from "./world3d.ts";
import type { Color } from "./color.ts";
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
import { type Lut, readCube, readStrip } from "./post.ts";
import { SMOKE_OPTS } from "./smoke.ts";
import { ability, emitter, follow, route, turnToward, tween, unroll } from "./vfx.ts";
import { SPELL_OPTS, spell } from "./spells.ts";
import { bayer, fbm, globRe, gridRows, latticeHash, profile, rng, vec, vnoise, seamless } from "./util.ts";

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
  grad: "x:n y:n w:n h:n colors:S ?dir:s soft:n seam:s",
  noise: "x:n y:n w:n h:n colors:S ?density:n seed:n on:s",
  recolor: "map:o ?where:r density:n",
  shade: "?where:r steps:n density:n",
  light: "?where:r steps:n density:n",
  relight: "?where:r opts:o",
  warp: "fn:f ?where:r",
  effect: "name:s ?opts:o",
  plane: "view:o fn:f ?where:r",
  terrain: "view:o height:f fn:f ?opts:o",
  solids: "view:o shapes:a ?opts:o",
  shadows: "view:o shapes:a opts:o",
  mesh: "view:v faces:a mats:o ?opts:o",
  surface: "field:o ?opts:o",
  voxels: "grid:o ?opts:o",
  volume: "density:o ?opts:o",
  splats: "set:o ?opts:o",
  decal: "name:s ?opts:o",
  draw3d: "world:o ?opts:o",
  capsule: "x0:n y0:n r0:n x1:n y1:n r1:n ramp:s ?opts:o",
  flame: "x:n y:n size:n keys:s ?opts:o",
  scroll: "name:s y:n per:n ?opts:o",
  clouds: "opts:o",
  plume: "x:n y:n keys:s ?opts:o",
  smoke: "x:n y:n keys:S ?opts:o",
  particles: "emit:f keys:S ?opts:o",
  trail: "path:f keys:S ?opts:o",
  cast: "spell:o ?opts:o",
  shake: "spell:o",
  rampmap: "ramp:S ?opts:o",
  stamp: "name:s ?x:n y:Y opts:o",
  tile: "name:s x:n y:n ?cols:n rows:n opts:o",
  pattern: "name:s x:n y:n w:n h:n ?opts:o",
  panel: "name:s x:n y:n w:n h:n ?opts:o",
  tilemap: "map:s opts:o",
  scatter: "name:s x:n y:n w:n h:n count:n ?opts:o",
  grid: "x:n y:n str:s",
  runs: "rows:o",
  wire: "x0:n y0:n x1:n y1:n sag:n c:c ?opts:o",
  text: "x:n y:n str:t c:K ?opts:o",
  bubble: "x:n y:n title:t lines:L opts:o",
  cells: "rows:R ?opts:o",
  clip: "where:r ...items:I",
  lamp: "x:n y:n ?opts:o",
  bump: "?shape:s opts:o",
  normals: "x:n y:n str:s",
  lighting: "?opts:o",
  glow: "keys:S ?opts:o",
  post: "?opts:o",
};

/** Ops that read the frame and the loop (c.frame, c.frames), as a function can. */
const CLOCKED = new Set(["surface", "voxels", "volume", "splats", "decal", "draw3d", "flame", "scroll", "clouds", "plume", "effect", "smoke", "particles", "trail", "cast", "shake"]);
/** Does any item draw with a function or a clocked op (top level, in layers, frames, clips, plates)? */
function drawsWithFunctions(items: Item[]): boolean {
  return items.some((v) => typeof v === "function" || (isLayer(v) && drawsWithFunctions(v.items)) || (isOp(v) && (CLOCKED.has(v.name) || drawsWithFunctions(v.args as Item[]))));
}

/** A function among these items whose code reads its canvas's frame or phase (c.frame, c.phase). */
function readsClock(items: Item[]): boolean {
  return items.some((v) => (typeof v === "function" && /\b[a-zA-Z_$][\w$]*\.(frame|phase)\b/.test(String(v))) || (isLayer(v) && readsClock(v.items)));
}

/** Options every placement takes (stamp, tile, pattern, panel, scatter, tilemap, wire hangs). */
const PLACE = ["fit", "flip", "rot", "swap", "rflip", "rswap", "shade", "silhouette", "cast", "castBase", "seed", "reseed", "frame", "delay", "rdelay", "fx"];
/** Allowed option keys of ops whose last argument is an options object. */
export const OP_OPTS: Record<string, string[]> = {
  stamp: [...PLACE, "sub", "smear", "at", "id", "z", "heading", "shadow", "t"],
  tile: [...PLACE, "shadow"],
  pattern: PLACE,
  panel: PLACE,
  scatter: [...PLACE, "on", "clip", "below", "even", "near", "within"],
  tilemap: [...PLACE, "map", "corners", "iso", "size", "w", "h", "x", "y"],
  wire: [...PLACE, "hang", "every", "start"],
  text: ["scale", "gap", "lead", "align", "shadow", "font"],
  bubble: ["panel", "tail", "rule", "more", "font", "color", "side", "t", "unit", "pad"],
  cells: ["at", "gap", "key", "head", "side"],
  lamp: ["r", "color", "power", "z"],
  curve: ["width", "closed"],
  arc: ["inner", "taper"],
  relight: ["light", "reach", "strength", "ramps", "glint"],
  rampmap: ["where", "hue"],
  bump: ["w", "depth", "on", "where", "shapeRadius", "shapeStrength", "shapeSoftness", "detailStrength", "detailScale"],
  lighting: ["cell", "ambient", "ambientColor", "sky", "skyColor", "skyReach", "block", "smooth", "emit", "emitLight", "shape", "relief", "skyDir"],
  glow: ["where", "r", "strength", "color", "bands", "ramp", "keep"],
  post: ["focus", "sharp", "soft", "blur", "bloom", "fog", "vignette", "pixel", "sharpen", "lut", "grain", "palette", "px"],
  terrain: ["far", "top", "bound", "margin", "sky"],
  // one options object serves both: solids ignores shade, shadows ramps and light
  solids: ["at", "sun", "scale", "ramps", "light", "shade"],
  shadows: ["at", "sun", "scale", "shade", "ramps", "light"],
  mesh: ["light", "sprites", "pixel", "sun", "sky", "lamps", "emit", "shadows", "ppm", "at", "stand"],
  surface: SURFACE_OPTS,
  voxels: VOXEL_OPTS,
  volume: VOLUME_OPTS,
  splats: SPLAT_OPTS,
  decal: DECAL_OPTS,
  draw3d: DRAW3D_OPTS,
  capsule: ["light", "rim"],
  flame: ["wind", "period", "seed", "frame"],
  scroll: ["x", "y", "frame", "axis"],
  clouds: ["y", "gap", "w", "h", "n", "seed", "keys", "x", "empty", "sizes", "frame"],
  plume: ["every", "life", "rise", "wind", "inertia", "size", "young", "seed", "frame", "light", "view", "at"],
  smoke: SMOKE_OPTS,
  particles: ["x", "y", "trail", "size"],
  trail: ["length", "width", "fade", "step", "from", "t", "taper", "side"],
};

export const ASSET_OPTS: Record<AssetKind, string[]> = {
  sprite: ["w", "h", "base", "mx", "my", "swap", "flip", "rot", "angle", "rotate", "outline", "outline8", "inline", "selout", "caps", "aa", "crop", "layers", "pivot", "sockets", "wrap", "slice", "png", "area", "palettize", "shrink", "facing", "height", "twin", "register"],
  scene: ["w", "h", "bg", "mx", "my", "swap", "flip", "rot", "angle", "rotate", "outline", "outline8", "inline", "selout", "crop", "layers", "pivot", "wrap", "world", "frames", "fps", "check", "pixel", "sizes"],
  anim: ["w", "h", "base", "mx", "my", "swap", "flip", "rot", "angle", "rotate", "outline", "outline8", "inline", "selout", "caps", "aa", "crop", "layers", "pivot", "sockets", "wrap", "slice", "png", "area", "palettize", "shrink", "fps", "frames", "ms", "loop", "dir", "facing", "height", "twin", "register", "world", "check"],
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
export const LAYER_OPTS = ["x", "y", "sort", "hidden", "shade", "light", "of", "cast", "except", "density", "blend", "opacity", "palettize", "solid", "wall", "unlit", "ref", "outline"];
const SHEET_OPTS = ["cols", "pad", "extrude", "rows"];

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
      case "Y": if (v !== "ground" && (typeof v !== "number" || !Number.isFinite(v))) bad('a number, or "ground" (world.ground under x)'); break;
      case "c": if (typeof v !== "string") bad('a color key or "#hex"'); break;
      case "K": if (typeof v !== "string" && typeof v !== "function") bad('a color key or "#hex", or (i, ch) => one for each letter'); break;
      case "s": if (typeof v !== "string") bad("a string"); break;
      case "t": if (typeof v !== "string" && typeof v !== "number") bad("text"); break;
      case "S": if (typeof v !== "string" && !Array.isArray(v)) bad('colors like "abc" or ["a","b"]'); break;
      case "a": if (!Array.isArray(v)) bad("an array of numbers"); break;
      case "o": if (typeof v !== "object" || v === null || Array.isArray(v)) bad("an options object"); break;
      case "b": if (typeof v !== "boolean") bad("true/false"); break;
      case "f": if (typeof v !== "function") bad("a function"); break;
      case "v": if (typeof v !== "function" && !["side", "top", "iso"].includes(v as string) && (typeof v !== "object" || v === null || Array.isArray(v))) bad("a camera: perspective(...) or its { w, horizon, eye, ... }, an orthographic view (\"side\", \"top\", \"iso\" or { kind, yaw, pitch, origin, grid }), or a function from a point to [col, row, depth]"); break;
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
  /** 3D files to write (export3d): a voxel grid or a mesh, its materials' colors, the formats */
  /** expect3d's rules, run by pxl check */
  readonly expects: { name: string; world: World; rules: Rule[]; frames: number; ms: number; loc?: string }[] = [];
  /** Run expect3d's rules: each its name, text, whether it held and where not. */
  runExpects() { return this.expects.flatMap((e) => runExpects(e.world, e.rules, e.frames, e.ms).map((r) => ({ ...r, name: e.name, loc: e.loc }))); }
  readonly models: { name: string; thing: Voxels | Mesh3 | Splats; colors: Color[]; ramps: Color[][]; as: ("vox" | "obj" | "glb" | "ply")[]; loc?: string; frames?: (Voxels | Mesh3 | Splats)[] | (() => (Voxels | Mesh3 | Splats)[]); fps?: number; paint?: (t: Voxels | Mesh3 | Splats) => { colors: Color[]; ramps: Color[][] } }[] = [];
  readonly fonts = new Map<string, FontDef>();
  /** rig() skeletons by name, for describe's RIG section. */
  readonly rigs = new Map<string, RigDef>();
  /** views() sets: each drawn view's sprite, the set its rows are held against, pxl check reads them */
  readonly views = new Map<string, { drawn: string[]; like?: string; chin?: Record<string, number>; baked?: boolean; loc?: string }>();
  /** rig3d() figures: the body and each move's poses at its headings, pxl check reads their joints */
  readonly figures = new Map<string, { body: Body; moves: { m: string; frames: number; pose: (i: number, h: number) => Pose; heads: { deg: number; name: string }[] }[]; loc?: string }>();
  /** What building found wrong but not fatal (a shade step that left its ramp): the CLI prints them, pxl check counts them. */
  readonly warnings: { msg: string; loc?: string }[] = [];

  warn(msg: string, loc?: string): void {
    if (!this.warnings.some((w) => w.msg === msg && w.loc === loc)) this.warnings.push({ msg, loc });
  }
  private glyphCache = new Map<string, (ch: string) => string[]>();
  /** Art files loaded so far (absolute paths or virtual names), for locations and watching. */
  readonly files: string[] = [];
  pal: Palette = Palette.builtin("pico8").asDefault();
  /** Where each ramp was first made (ramps(), shades()), for pal()'s warning when it recolors one. */
  private rampLoc = new Map<string, string | undefined>();
  /** The includer's ramps while a file it includes (without `palette`) runs: that file's pal() may recolor them, they aren't its own. */
  private outerRamps = new Set<string>();
  /** look3d()'s light and mats: the 3D ops' when they don't say them, taken by each asset defined after it, as the palette is. */
  look3d?: { light?: number[]; mats?: Record<string, unknown> };
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
  readonly tracing: boolean;

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
      // a variant of an anim (base + swap) plays as it does: its clock and pivot, unless it says
      // otherwise (it drew one frame at 8 fps, still, where its base moved)
      const from = kind === "anim" && typeof opts.base === "string" ? this.assets.get(opts.base) : undefined;
      if (from?.kind === "anim" && !rest.some((v) => isOp(v) && v.name === "frame")) {
        for (const k of ["fps", "frames", "loop", "dir", "pivot"] as const) if (opts[k] === undefined && from.opts[k] !== undefined) (opts as Record<string, unknown>)[k] = from.opts[k];
        const d = animTimeline(from).durations!;
        if (opts.frames === undefined) opts.frames = d.length;
        // (a base timed by its frame()s' ms, all alike: that pace, not 8 fps; a walk at 110 ms and its
        // variant at 125 made a 22 s loop of 4400 frames)
        if (opts.fps === undefined && d.every((v) => v === d[0])) opts.fps = 1000 / d[0];
      }
      const light = opts.world?.light, pair = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
      if (light !== undefined && light !== false && !pair(light) && !(isPlainObject(light) && pair((light as { at?: unknown }).at)))
        throw new PxError(`${kind} '${name}': world.light is where the light comes from, [x, y] (e.g. [0.6, -1]: the top right), or a point light in the scene, { at: [x, y] } (false: none read); got ${JSON.stringify(light)}`, loc);
      const items = checkItems(`${kind} '${name}'`, rest, loc);
      const png = opts.png === undefined ? undefined : this.readPng(`${kind} '${name}'`, opts, loc), top = this.callerLoc(true), look3d = this.look3d;
      this.assets.set(name, { kind, name, opts, items, pal: this.pal, loc, top, png, look3d });
      this.order.push(name);
      // a scene's pixel: px to an art pixel; its sizes: the same scene k times as big under other names, not checked
      const whole = (k: unknown) => Number.isInteger(k) && (k as number) >= 1;
      if (opts.pixel !== undefined && !whole(opts.pixel)) throw new PxError(`${kind} '${name}': pixel is px to an art pixel (mesh(), the 3D ops and post() draw that many times as big), a whole number from 1, got ${JSON.stringify(opts.pixel)}`, loc);
      if (opts.sizes !== undefined) {
        if (!isPlainObject(opts.sizes) || !Object.values(opts.sizes).every(whole) || opts.pixel !== undefined) throw new PxError(`${kind} '${name}': sizes names the same scene k times as big, { ${name}_hd: 4 } (whole numbers; the scene itself at pixel 1), got ${JSON.stringify(opts.sizes)}`, loc);
        for (const [n, k] of Object.entries(opts.sizes as Record<string, number>)) {
          const other = this.assets.get(n) ?? this.groups.get(n);
          if (other) throw new PxError(`'${n}' (a size of '${name}') is already defined at ${other.loc}`, loc);
          const { sizes: _, ...so } = opts;
          this.assets.set(n, { kind, name: n, opts: { ...so, w: opts.w! * k, h: opts.h! * k, pixel: k, check: false }, items, pal: this.pal, loc, top, look3d });
          this.order.push(n);
        }
      }
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
      const loc = this.callerLoc(), was = this.pal;
      try { this.pal = this.pal.extend(aliases); } catch (e) { throw wrap(e).within("pal", loc); }
      // a key a ramp runs through given another color: shade() and light() step along the new colors
      // (a file reusing an included kit's keys 1-8 for its own turned the kit's ramps into its colors)
      for (const r of new Set(this.pal.ramps)) {
        if (this.outerRamps.has(r)) continue;
        const ks = [...new Set(r)].filter((k) => k in aliases && was.keys.get(k) !== this.pal.keys.get(k));
        if (!ks.length) continue;
        const L = [...r].map((k) => oklab(this.pal.keys.get(k)!)[0]), dark = L.findIndex((l, i) => i > 0 && l < L[i - 1] - 0.02) > 0;
        this.warn(`pal: ${ks.map((k) => `'${k}'`).join(", ")} given another color, but the ramp "${r}"${this.rampLoc.get(r) ? ` (made at ${this.rampLoc.get(r)})` : ""} runs through ${ks.length > 1 ? "them" : "it"}: shade() and light() now step along the new colors${dark ? ", and the ramp no longer runs dark to light" : ""}. A new color wants a key no ramp uses`, loc);
      }
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
        if (!this.rampLoc.has(ks.join(""))) this.rampLoc.set(ks.join(""), loc);
      } catch (e) { throw wrap(e).within("shades", loc); }
    };
    env.ramps = (...ramps: string[]) => {
      try { this.pal = this.pal.withRamps(ramps); } catch (e) { throw wrap(e).within("ramps", this.callerLoc()); }
      for (const r of ramps) if (!this.rampLoc.has(r)) this.rampLoc.set(r, this.callerLoc());
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
    // corners(prefix, { size, variants, smooth }, (x, y, t, v) => key): a corner terrain's 16 pieces, `prefix_<mask>`
    env.corners = (prefix: unknown, opts: unknown, fn: unknown) => {
      const loc = this.callerLoc();
      try {
        if (typeof prefix !== "string" || !isPlainObject(opts) || typeof fn !== "function")
          throw new PxError('corners("dirt", { size: 16, variants?: 3, smooth?: true }, (x, y, t, v) => key or null): t how much of the terrain the corners give that pixel, 0..1');
        checkKeys("corners", opts, ["size", "variants", "smooth"]);
        const { size: S, variants: V = 1, smooth } = opts as { size?: number; variants?: number; smooth?: boolean };
        if (!(Number.isInteger(S) && S! > 0) || !(Number.isInteger(V) && V >= 1)) throw new PxError(`corners: size is the tile's px and variants how many of each piece, whole numbers, got ${JSON.stringify([S, V])}`);
        // corner bits 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right: blended over the tile (smooth: eased in and out)
        const ease = (s: number) => (smooth ? s * s * (3 - 2 * s) : s), size = S!;
        for (let m = 0; m < 16; m++) {
          const pieces = Array.from({ length: V }, (_, v) => {
            const keys: (string | null)[] = [];
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
              const u = ease((x + 0.5) / size), w = ease((y + 0.5) / size);
              const t = (m & 1) * (1 - u) * (1 - w) + ((m >> 1) & 1) * u * (1 - w) + ((m >> 2) & 1) * (1 - u) * w + ((m >> 3) & 1) * u * w;
              keys.push(((fn as (x: number, y: number, t: number, v: number) => unknown)(x, y, t, v) ?? null) as string | null);
            }
            return keys;
          });
          if (pieces.every((k) => k.every((c) => c === null))) continue;   // a piece with nothing in it (no terrain at any corner) isn't made
          const names = pieces.map((_, v) => (V > 1 ? `${prefix}_${m}_${v}` : `${prefix}_${m}`));
          pieces.forEach((keys, v) => define("sprite", names[v], [{ w: size, h: size }, (c: Canvas) => keys.forEach((k, i) => { if (k !== null) c.px(i % size, Math.floor(i / size), k); })]));
          if (V > 1) (env.group as (n: string, m: string[]) => void)(`${prefix}_${m}`, names);
        }
      } catch (e) { throw wrap(e).within("corners", loc); }
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
    // turnaround(name, thing, { view, ppm, n, headings, part, ... }): a thing in 3D seen from N headings,
    // a sprite (or anim) each, named by the compass, the east mirrored from the west where it can be (turnaround.ts)
    env.turnaround = (name: unknown, thing: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (typeof name !== "string" || !name || !isPlainObject(opts)) throw new PxError('turnaround("house", make3d.house(), { view: "iso", n: 8, ppm: 16 })');
        checkKeys("turnaround", opts, ["view", "ppm", "n", "headings", "part", "mats", "light", "as", "size", "spacing", "frames", "fps", "mirror", "pad"]);
        const o = opts as { view?: unknown; ppm?: number; n?: number; headings?: unknown; part?: string; mats?: unknown; light?: unknown; as?: string; size?: number; spacing?: number; frames?: number; fps?: number; mirror?: unknown; pad?: number };
        // what is turned: a field or a built thing, or a world's part standing at the origin
        let b: Partial<Built> | undefined, only: string[] | undefined, at0 = [0, 0, 0];
        if (thing instanceof World) {
          if (typeof o.part !== "string" || !thing.spec.parts[o.part]) throw new PxError(`turnaround: a world's part is { part: "name" } (it has: ${thing.names.join(", ")}), got ${JSON.stringify(o.part)}`);
          const p = thing.place(o.part);
          b = thing.built(o.part); only = [o.part]; at0 = [-p[0], -p[1], -p[2]];
        } else b = thing instanceof Sdf ? { field: thing } : (thing as Built);
        const field = b?.field;
        if (!(field instanceof Sdf)) throw new PxError("turnaround: a field (sdf.*), a built thing (make3d.house(...)) or a world with { part }: something solid");
        const { frames, fps = 8, ppm = 16, pad = 2, mirror = "auto", view = "iso" } = o;
        if (!(frames === undefined || (Number.isInteger(frames) && frames >= 1)) || !(fps > 0) || !(ppm > 0) || !(Number.isInteger(pad) && pad >= 0) || ![true, false, "auto"].includes(mirror as boolean))
          throw new PxError(`turnaround: frames (an anim's, when the thing moves on the clock), fps above 0, ppm above 0, pad (px, whole), mirror true, false or "auto", got ${JSON.stringify({ frames, fps, ppm, pad, mirror })}`);
        const persp = !!view && typeof view === "object" && "horizon" in view, kind = typeof view === "string" ? view : (view as { kind?: string })?.kind;
        const H = headingsOf(o.n ?? 8, o.headings, !persp && kind === "iso"), clocks = clocksOf(frames, fps);
        const T = turnViews(view, ppm, field, H.map((h) => h.deg), clocks, pad);
        // mirrored (the east from the west, as the traveler's) where the thing is its own mirror and its light
        // comes from the picture's middle (above, in front, behind): what a flip keeps
        const L = o.light ?? this.look3d?.light, y0 = persp ? (view as View).yaw ?? 0 : (view as { yaw?: number })?.yaw ?? (kind === "iso" ? 45 : 0);
        const level = Array.isArray(L) && Math.abs(L[0] * Math.cos((y0 * Math.PI) / 180) - L[1] * Math.sin((y0 * Math.PI) / 180)) < 0.05 * Math.hypot(...(L as number[]));
        const sym = mirror === true || (mirror === "auto" && level && !Object.keys(b.details ?? {}).length && Object.values(b.decals ?? {}).every((d) => Math.abs(d.point[0]) < 0.01) && mirrorSymmetric(field, clocks));
        const kindA = frames ? "anim" : "sprite", names = H.map((h) => `${name}_${h.name}`);
        const twin = H.map((h) => (sym && h.deg > 0 && h.deg < 180 ? H.findIndex((g) => Math.abs(g.deg - (360 - h.deg)) < 1e-9) : -1));
        H.forEach((_, i) => {
          if (twin[i] >= 0) return;
          const v = T.views[i], light = Array.isArray(L) ? turnLight(L as number[], v.turn) : L;
          const draw = { view: v.view, at: [v.at[0] + at0[0], v.at[1] + at0[1], v.at[2] + at0[2]], ...(persp ? {} : { ppm }), ...(o.mats !== undefined ? { mats: o.mats } : {}), ...(light !== undefined ? { light } : {}),
            ...(o.as !== undefined ? { as: o.as } : {}), ...(o.size !== undefined ? { size: o.size } : {}), ...(o.spacing !== undefined ? { spacing: o.spacing } : {}), ...(only ? { only } : {}) };
          define(kindA, names[i], [{ w: T.w, h: T.h, pivot: T.pivot, ...(frames ? { frames, fps } : {}) }, (c: Canvas) => c.draw3d(thing, draw as never)]);
        });
        H.forEach((_, i) => { if (twin[i] >= 0) define(kindA, names[i], [{ base: names[twin[i]], flip: "x", pivot: T.pivot }]); });
        (env.group as (n: string, m: string[]) => void)(name, names);
        return { names, headings: H.map((h) => h.name), w: T.w, h: T.h, pivot: T.pivot, mirrored: names.filter((_, i) => twin[i] >= 0) };
      } catch (e) { throw wrap(e).within("turnaround", loc); }
    };
    // views(name, { s: grid, sw: grid, ... }, { anchor, like }): hand-drawn views of a thing (a head), a
    // sprite each pivoted on its anchor, the views not drawn the mirrors of those across; a group to
    // stamp by heading (rig3d.ts); pxl check holds their rows together
    env.views = (name: unknown, grids: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        const model = grids instanceof Sdf ? grids : undefined;
        if (typeof name !== "string" || !name || !(model || isPlainObject(grids)) || !isPlainObject(opts)) throw new PxError('views("_head", { s: grid, sw: grid, w: grid, nw: grid, n: grid } or a field (the head modeled), { anchor: [x, y] (or { s: [x, y], ... }), like: "_other_head" })');
        const BAKE = ["n", "pitch", "light", "mats", "surface", "ink", "jaw", "retouch"];
        checkKeys("views", opts, ["anchor", "like", "chin", "swap", "outline", "outline8", "inline", "selout", ...(model ? BAKE : [])]);
        const { anchor, like, chin, n: nv, pitch, light, mats, surface: sopts, ink, jaw, retouch, ...so } = opts as { anchor?: unknown; like?: unknown; chin?: unknown; n?: number; pitch?: number; light?: number[]; mats?: Record<string, unknown>; surface?: Record<string, unknown>; ink?: string; jaw?: string[]; retouch?: Record<string, string> };
        // a head modeled (a field in its own frame: x its right, y ahead, z up, px, its middle where it is
        // stamped), drawn once per view as rig3d draws a figure (surface(), the line all round it, `jaw`'s
        // line under the skin), then each view's `retouch` painted over it by hand ("." keeps the render's
        // pixel, "_" erases one), its `anchor` pixel on the head's middle
        let baked: Record<string, (c: Canvas) => void> | undefined, R = 0;
        if (model) {
          if (nv !== undefined && nv !== 8 && nv !== 16) throw new PxError(`views: n is 8 or 16, the directions it is drawn for, got ${JSON.stringify(nv)}`);
          if (sopts !== undefined) { if (!isPlainObject(sopts)) throw new PxError("views: surface is surface()'s options ({ soft, clean, ... })"); checkKeys("views surface", sopts, SURFACE_OPTS.filter((k) => !["view", "ppm", "at", "part"].includes(k))); }
          if (jaw !== undefined && !(Array.isArray(jaw) && jaw.length === 2 && jaw.every((k) => typeof k === "string" && k))) throw new PxError(`views: jaw is [key, the skin's ramp]: the line of key under the skin, where the line round it is under the face, got ${JSON.stringify(jaw)}`);
          if (retouch !== undefined && !(isPlainObject(retouch) && Object.entries(retouch).every(([d, g]) => COMPASS.includes(d) && typeof g === "string"))) throw new PxError("views: retouch is { s: grid, ... }: per view, pixels painted over the render (\".\" keeps it, \"_\" erases)");
          const sp = Math.sin(((pitch ?? 20) * Math.PI) / 180), cp = Math.cos(((pitch ?? 20) * Math.PI) / 180), { lo, hi, mats: names } = compile(model);
          // one size for every view: the farthest the head reaches from its middle, turned any way, and a pixel of line round it
          R = Math.ceil(Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => Math.hypot(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1]) * sp + Math.abs(i & 4 ? hi[2] : lo[2]) * cp), ...[lo[0], hi[0], lo[1], hi[1]].map(Math.abs))) + 2;
          // its materials: the look's, those it names that are ramps of keys ("JjhH"), what is given
          const look = (this.look3d?.mats ?? {}) as Record<string, unknown>, M = { ...look, ...Object.fromEntries(names.filter((m) => m && !(m in look)).map((m) => [m, m])), ...mats };
          const L = light ?? this.look3d?.light ?? [0, -0.6, 0.75], line = ink !== undefined ? { outline: false, rim: false, inner: ink } : { outline: true, inner: true };
          const bake = (d: string) => (c: Canvas) => {
            c.surface(model.rotate(-COMPASS.indexOf(d) * 22.5, "z"), { view: { kind: "side", pitch: pitch ?? 20 }, ppm: 1, at: [R + 0.5, R + 0.5], mats: M, light: L, ...line, shadows: false, ao: 0, ...sopts } as never);
            const { w: W, h: Hh, data } = c.img, on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < Hh && (data[y * W + x] & 255) >= 128;
            if (ink !== undefined) {
              const skin = new Set([...(jaw?.[1] ?? "")].map((k) => c.color(k))), out: [number, number, string][] = [];
              for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))) out.push([x, y, jaw && on(x, y - 1) && skin.has(data[(y - 1) * W + x]) ? jaw[0] : ink]);
              for (const [x, y, k] of out) c.px(x - c.ox, y - c.oy, k);
            }
            const g = retouch?.[d];
            if (!g) return;
            const a = isPlainObject(anchor) ? anchor[d] : anchor;
            if (!(Array.isArray(a) && a.length === 2 && a.every(Number.isInteger))) throw new PxError(`views: retouch '${d}' needs its anchor, the pixel [col, row] of its grid on the head's middle`);
            gridRows(g).forEach((row, y) => [...row].forEach((k, x) => { if (k !== ".") { const px = R + x - a[0], py = R + y - a[1]; if (k === "_") c.plot(px, py, TRANSPARENT); else c.px(px, py, k); } }));
          };
          // the west drawn and the east its mirror where the light comes from the middle (as rig3d's), else every one
          const all = COMPASS.filter((_, i) => nv === 16 || i % 2 === 0), level = Math.abs(L[0]) < 0.05 * Math.hypot(...L);
          baked = Object.fromEntries(all.filter((d) => !level || d === "n" || COMPASS.indexOf(d) >= 8).map((d) => [d, bake(d)]));
        }
        const G = (baked ?? grids) as Record<string, unknown>;
        if (chin !== undefined && !(Number.isInteger(chin) && (chin as number) >= 0)) throw new PxError(`views: chin is the row of the chin in every view's grid (0 its top row), for a set whose lowest rows aren't the chin (a beard, a braid), got ${JSON.stringify(chin)}`);
        const drawn = Object.keys(G), bad = drawn.filter((d) => !COMPASS.includes(d));
        if (!drawn.length || bad.length) throw new PxError(`views: the views are named by the compass (${COMPASS.join(", ")}), got ${JSON.stringify(bad.length ? bad : drawn)}`);
        if (like !== undefined && typeof like !== "string") throw new PxError(`views: like names another views() set whose rows these keep to, got ${JSON.stringify(like)}`);
        // a pixel [col, row] lands on the anchor (its middle, so a mirror keeps it there); "center", "bottom"
        const pivotOf = (d: string) => {
          const a = isPlainObject(anchor) ? anchor[d] : anchor;
          if (a === undefined || a === "center" || a === "bottom") return a === undefined ? {} : { pivot: a };
          if (Array.isArray(a) && a.length === 2 && a.every(Number.isInteger)) return { pivot: [a[0] + 0.5, a[1] + 0.5] };
          throw new PxError(`views: an anchor is the pixel [col, row] of the view that lands where it is stamped, "center" or "bottom" (one for all, or { ${d}: [col, row], ... }), got ${JSON.stringify(a)}`);
        };
        for (const d of drawn) {
          if (baked) { define("sprite", `${name}_${d}`, [{ ...so, w: 2 * R + 1, h: 2 * R + 1, pivot: [R + 0.5, R + 0.5] }, baked[d]]); continue; }
          const g = G[d], rows = Array.isArray(g) && g.every((r) => typeof r === "string" && !r.includes("\n"));
          // rows padded to one width, a grid string, or items (a grid and runs())
          const items = typeof g === "string" ? [g] : rows ? [(g as string[]).map((r) => r.padEnd(Math.max(...(g as string[]).map((q) => q.length)), ".")).join("\n")] : Array.isArray(g) ? g : undefined;
          if (!items) throw new PxError(`views: view '${d}' is a grid (a string, or its rows), or items ([grid, runs(...)]), got ${JSON.stringify(g)?.slice(0, 60)}`);
          define("sprite", `${name}_${d}`, [{ ...so, ...pivotOf(d) }, ...items]);
        }
        const names: string[] = [];
        for (const [i, d] of COMPASS.entries()) {
          const twin = COMPASS[(16 - i) % 16];
          if (!drawn.includes(d) && !drawn.includes(twin)) continue;
          if (!drawn.includes(d)) define("sprite", `${name}_${d}`, [{ base: `${name}_${twin}`, flip: "x" }]);
          names.push(`${name}_${d}`);
        }
        (env.group as (n: string, m: string[]) => void)(name, names);
        // the chin from each view's anchor (its pixel's row)
        const chins = chin === undefined ? undefined : Object.fromEntries(drawn.map((d) => {
          const a = isPlainObject(anchor) ? anchor[d] : anchor;
          if (!Array.isArray(a)) throw new PxError("views: chin needs the anchors as pixels [col, row] (the rows are counted from them)");
          return [`${name}_${d}`, (chin as number) - (a[1] as number)];
        }));
        this.views.set(name, { drawn: drawn.map((d) => `${name}_${d}`), like: like as string | undefined, ...(chins ? { chin: chins } : {}), ...(model ? { baked: true } : {}), loc });
        return names;
      } catch (e) { throw wrap(e).within("views", loc); }
    };
    // rig3d(name, { body, moves, n, parts, head, blocks, ... }): a figure on the 3D layer, its moves in
    // every direction asked, drawn by surface(); its flat blocks to judge a move (rig3d.ts)
    env.rig3d = (name: unknown, opts: unknown) => {
      const loc = this.callerLoc();
      try {
        if (typeof name !== "string" || !name || !isPlainObject(opts)) throw new PxError('rig3d("tr", { body: { h: 34, heads: 3 }, moves: { walk: { frames: 8, ms: 110, pose: (i, heading) => ({ feet, lift, hands }) } }, n: 8, blocks: true })');
        checkKeys("rig3d", opts, ["body", "moves", "n", "headings", "pitch", "w", "h", "pivot", "parts", "mats", "light", "outline", "inner", "ink", "surface", "head", "chin", "blocks", "mirror", "draw"]);
        const o = opts as { body?: Record<string, unknown>; moves?: unknown; n?: number; headings?: unknown; pitch?: number; w?: number; h?: number; pivot?: number[]; parts?: unknown; mats?: Record<string, unknown>; light?: number[]; outline?: unknown; inner?: unknown; ink?: unknown; surface?: Record<string, unknown>; head?: unknown; chin?: unknown; blocks?: unknown; mirror?: unknown; draw?: unknown };
        if (o.surface !== undefined) { if (!isPlainObject(o.surface)) throw new PxError("rig3d: surface is surface()'s options for the painted figure ({ soft, shadows, ao, rim, ... })"); checkKeys("rig3d surface", o.surface, SURFACE_OPTS.filter((k) => !["view", "ppm", "at", "part"].includes(k))); }
        if (o.chin !== undefined && typeof o.chin !== "string" && !(Array.isArray(o.chin) && o.chin.length === 2 && o.chin.every((k) => typeof k === "string" && k) && !o.head))
          throw new PxError(`rig3d: chin is a key (the line under the head), or with a head modeled [key, the skin's ramp] (the line under the jaw only), got ${JSON.stringify(o.chin)}`);
        if (o.ink !== undefined && typeof o.ink !== "string") throw new PxError(`rig3d: ink is a key: the line round the figure outside and round each part on the one behind (instead of surface()'s outline on the shadow side), got ${JSON.stringify(o.ink)}`);
        const B: Body = bodyOf(o.body ?? {}), H = headingsOf(o.n ?? 8, o.headings, false), pitch = o.pitch ?? 20;
        if (!(pitch >= 0 && pitch <= 90)) throw new PxError(`rig3d: pitch is degrees down, 0 to 90 (20: a field sprite's), got ${JSON.stringify(pitch)}`);
        const prefix = o.blocks === true ? "bk" : o.blocks === false || o.blocks === undefined ? undefined : o.blocks;
        if (prefix !== undefined && (typeof prefix !== "string" || !prefix)) throw new PxError(`rig3d: blocks is true (bk_<move>_<dir>) or a prefix for their names, got ${JSON.stringify(o.blocks)}`);
        if (o.parts !== undefined && typeof o.parts !== "function") throw new PxError("rig3d: parts is (j, pose) => ({ name: piece or [pieces] }): j.limb(a, b, r0, r1, paint), j.ball(c, r, paint) or fields");
        if (!o.parts && prefix === undefined) throw new PxError("rig3d: give it parts (the figure painted) or blocks (its flat blocks), or both");
        for (const k of ["draw"] as const) if (o[k] !== undefined && typeof o[k] !== "function") throw new PxError(`rig3d: ${k} is (c, j, pose) => { ... }`);
        if (o.head !== undefined && typeof o.head !== "string") throw new PxError(`rig3d: head names a views() set (or a group of compass-named views) stamped on the head, got ${JSON.stringify(o.head)}`);
        if (!isPlainObject(o.moves) || !Object.keys(o.moves).length) throw new PxError("rig3d: moves is { walk: { frames, ms, pose: (i, heading) => pose, dirs?, draw? }, ... }");
        const moves = Object.entries(o.moves).map(([m, M]) => {
          if (!isPlainObject(M)) throw new PxError(`rig3d: move '${m}' is { frames, ms, pose, dirs?, draw? }`);
          checkKeys(`rig3d move '${m}'`, M, ["frames", "ms", "pose", "dirs", "draw"]);
          const { frames, ms = 100, pose, dirs, draw } = M as { frames?: number; ms?: number; pose?: unknown; dirs?: unknown; draw?: unknown };
          if (!(Number.isInteger(frames) && frames! >= 1) || !(ms > 0) || typeof pose !== "function" || (draw !== undefined && typeof draw !== "function"))
            throw new PxError(`rig3d: move '${m}' is { frames (a whole number), ms (each frame's), pose: (i, heading) => pose, dirs?, draw? }, got ${JSON.stringify(M)}`);
          if (dirs !== undefined && !(Array.isArray(dirs) && dirs.every((d) => H.some((h) => h.name === d)))) throw new PxError(`rig3d: move '${m}''s dirs are some of its headings (${H.map((h) => h.name).join(", ")}), got ${JSON.stringify(dirs)}`);
          return { m, frames: frames!, ms, pose: pose as (i: number, h: number) => Pose, heads: H.filter((h) => !dirs || (dirs as string[]).includes(h.name)), draw: draw as ((c: Canvas, j: Joints, p: Pose) => void) | undefined };
        });
        const SP = Math.sin((pitch * Math.PI) / 180), CP = Math.cos((pitch * Math.PI) / 180);
        const fields = (j: Joints, p: Pose) => [...(prefix !== undefined ? [blocksOf(B, j)] : []), ...(o.parts ? [partsOf((o.parts as (j: Joints, p: Pose) => unknown)(j, p), j).field, sdf.sphere(B.r.head).at(j.head)] : [])];
        // one size for all: given, or every field's box seen at every frame and heading, a pixel round it
        let { w, h, pivot } = o;
        if (w === undefined || h === undefined || pivot === undefined) {
          let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
          for (const M of moves) for (const hd of M.heads) for (let i = 0; i < M.frames; i++) {
            const p = M.pose(i, hd.deg), j = jointsOf(B, p, hd.deg);
            for (const f of fields(j, p)) {
              const { lo, hi } = compile(f);
              for (let c = 0; c < 8; c++) {
                const q = [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]], sx = q[0], sy = -q[1] * SP - q[2] * CP;
                x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
              }
            }
          }
          const L = Math.ceil(-x0) + 2, T = Math.ceil(-y0) + 2;
          pivot ??= [L, T]; w ??= pivot[0] + Math.ceil(x1) + 3; h ??= pivot[1] + Math.ceil(y1) + 3;
        }
        if (!(Number.isInteger(w) && Number.isInteger(h) && Array.isArray(pivot) && pivot.length === 2 && pivot.every(Number.isInteger))) throw new PxError(`rig3d: w, h and pivot (the pixel the figure's foot point lands on, [x, y]) are whole numbers, got ${JSON.stringify({ w, h, pivot })}`);
        const [px, py] = pivot as [number, number];
        // where a point lands on the sprite and how near us it is: the joints' escape hatch
        const screen = (q: number[]): [number, number] => [px + q[0], py - q[1] * SP - q[2] * CP], depth = (q: number[]) => q[2] * SP - q[1] * CP;
        const joints = (p: Pose, heading: number) => Object.assign(jointsOf(B, p, heading), { screen, depth });
        const view = { kind: "side" as const, pitch }, at = [px + 0.5, py + 0.5], ink = typeof o.ink === "string" ? o.ink : typeof o.outline === "string" ? o.outline : this.pal.keys.has("k") ? "k" : "#000000";
        const look = this.look3d, light = o.light ?? look?.light ?? [0, -0.6, 0.75];
        // the east drawn as the west's mirror where the light comes from the picture's middle (as turnaround's)
        const level = Array.isArray(light) && Math.abs(light[0]) < 0.05 * Math.hypot(...light), sym = o.mirror === true || ((o.mirror ?? "auto") === "auto" && level);
        if (![true, false, "auto", undefined].includes(o.mirror as boolean)) throw new PxError(`rig3d: mirror is true, false or "auto", got ${JSON.stringify(o.mirror)}`);
        // the line round what is drawn, outside it, in the sprite's size
        const ring = (c: Canvas) => {
          const { w: W, h: Hh, data } = c.img, on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < Hh && (data[y * W + x] & 255) >= 128;
          const out: number[] = [];
          for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))) out.push(x, y);
          for (let i = 0; i < out.length; i += 2) c.px(out[i] - c.ox, out[i + 1] - c.oy, ink);
        };
        const paint = (c: Canvas, p: Pose, deg: number, flat: boolean, M: (typeof moves)[number]) => {
          const j = joints(p, deg);
          if (flat) {
            c.surface(blocksOf(B, j), { view, ppm: 1, at, mats: BLOCK_MATS, outline: false, rim: false, shadows: false, ao: 0, inner: ink });
            ring(c);
          } else {
            const P = partsOf((o.parts as (j: Joints, p: Pose) => unknown)(j, p), j);
            // ink: a line all round outside and on the part behind (the traveler's); else surface()'s, on the shadow side
            const line = o.ink !== undefined ? { outline: false, rim: false, inner: o.ink } : { outline: o.outline ?? true, inner: o.inner ?? true };
            const mats = { ...(look?.mats ?? {}), ...Object.fromEntries(P.ramps.map((r) => [r, r])), ...o.mats } as never;
            c.surface(P.field, { view, ppm: 1, at, mats, light, ...(line as object), shadows: false, ao: 0, ...o.surface });
            // a head modeled (a part named head, no views): the line of `chin` under its jaw where it meets the
            // body, under the head's pixels of the skin (chin: [key, the skin's ramp]; a key alone: its own
            // ramp but its darkest), not under the hair
            const parts = c.img.parts;
            if (!o.head && o.chin !== undefined && parts) {
              const [key, skin] = Array.isArray(o.chin) ? o.chin : [o.chin, [...(c.pal.ramps.find((r) => r.includes(o.chin as string)) ?? `.${o.chin}`)].slice(1).join("")];
              const { w: W, h: Hh, data } = c.img, part = (x: number, y: number) => parts.names[parts.ids[y * W + x]] ?? "", head = (x: number, y: number) => /^head(\.|$)/.test(part(x, y));
              const under = new Set([...(skin as string)].map((k) => c.color(k)));
              for (let x = 0; x < W; x++) {
                let y = Hh - 2;
                while (y >= 0 && !head(x, y)) y--;
                if (y >= 0 && under.has(data[y * W + x]) && part(x, y + 1) && !head(x, y + 1)) c.px(x - c.ox, y + 1 - c.oy, key);
              }
            }
            // brushes on it (tufts, strands: no line of their own, the line round it all takes them in), decals
            // pinned on it (a face drawn by hand), then the line round it all
            for (const S of P.brushes) {
              const set = scatter(S.field, { light, ...S.o } as never), own = Object.fromEntries(set.mats.filter((m) => m && !(m in (mats as object))).map((m) => [m, m]));
              c.splats(set, { view, ppm: 1, at, mats: { ...(mats as object), ...own } as never, light: (S.o.light as number[] | undefined) ?? light, part: S.part });
            }
            for (const D of P.decals) c.decal(D.asset, { on: D.on ?? P.field, point: D.point, ...(D.views ? { views: D.views } : {}), ...(D.up ? { up: D.up } : {}), ...(D.lit !== undefined ? { lit: D.lit } : {}), ...(D.depth !== undefined ? { depth: D.depth } : {}), ...(o.surface?.clean ? { clean: true } : {}), view, ppm: 1, at, light, part: D.part });
            if (o.ink !== undefined) ring(c);
            const head = o.head as string | undefined;
            if (head) {
              // the head by hand over all, the view its heading's; a line of `chin` under it where it meets the body
              const [hx, hy] = screen(j.head).map(Math.round), img = c.asset(head, { heading: j.hd.heading }), [ax, ay] = img.pivot ?? [0, 0], x0 = hx - Math.floor(ax), y0 = hy - Math.floor(ay);
              c.stamp(head, hx, hy, { heading: j.hd.heading });
              if (typeof o.chin === "string") for (let x = 0; x < img.w; x++) {
                let r = img.h - 1;
                while (r >= 0 && (img.data[r * img.w + x] & 255) < 128) r--;
                if (r >= 0 && c.get(x0 + x, y0 + r + 1)) c.px(x0 + x, y0 + r + 1, o.chin);
              }
            }
          }
          M.draw?.(c, j, p);
          (o.draw as ((c: Canvas, j: Joints, p: Pose) => void) | undefined)?.(c, j, p);
        };
        const names: string[] = [], frameOps = (M: (typeof moves)[number]) => Array.from({ length: M.frames }, () => ({ __op: true, name: "frame", args: [{ ms: M.ms }], loc }));
        for (const M of moves) {
          const groups: [string, string[]][] = [];
          for (const [flat, pre] of [[false, o.parts ? name : undefined], [true, prefix]] as const) {
            if (pre === undefined) continue;
            const fam = `${pre}_${M.m}`, list = M.heads.map((hd) => `${fam}_${hd.name}`);
            const twin = M.heads.map((hd) => (!flat && sym && hd.deg > 0 && hd.deg < 180 ? M.heads.findIndex((g) => Math.abs(g.deg - (360 - hd.deg)) < 1e-9) : -1));
            // (a move of one frame never reads the clock: a still pose)
            const draw = (hd: (typeof H)[number]) => (M.frames > 1 ? (c: Canvas) => paint(c, M.pose(c.frame, hd.deg), hd.deg, flat, M) : (c: Canvas) => paint(c, M.pose(0, hd.deg), hd.deg, flat, M));
            M.heads.forEach((hd, i) => { if (twin[i] < 0) define("anim", list[i], [{ w, h, pivot }, draw(hd), ...frameOps(M)]); });
            // (the mirrors after what they mirror, so they play as it does)
            M.heads.forEach((hd, i) => { if (twin[i] >= 0) define("anim", list[i], [{ base: list[twin[i]], flip: "x", pivot: [px + 1, py] }]); });
            groups.push([fam, list]);
            names.push(...list);
          }
          for (const [g, l] of groups) (env.group as (n: string, m: string[]) => void)(g, l);
        }
        this.figures.set(name, { body: B, moves: moves.map(({ m, frames, pose, heads }) => ({ m, frames, pose, heads })), loc });
        return { names, headings: H.map((hd) => hd.name), joints, screen, depth, w, h, pivot, body: B };
      } catch (e) { throw wrap(e).within("rig3d", loc); }
    };
    // gait(t, { heading | view, stride, lift, bob, hands, front: {...}, ... }): a walk's numbers by the view (rig3d.ts)
    env.gait = (t: unknown, o: unknown = {}) => {
      try { if (!isPlainObject(o)) throw new PxError("gait(t, { heading, stride, lift, bob, hands })"); return gait(t as number, o); } catch (e) { throw wrap(e).within("gait", this.callerLoc()); }
    };
    env.ik3 = (a: unknown, b: unknown, l1: unknown, l2: unknown, hint: unknown) => {
      try { return ik3(a as never, b as never, l1 as number, l2 as number, hint as never); } catch (e) { throw wrap(e).within("ik3", this.callerLoc()); }
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
      const pal = this.pal, outer = this.outerRamps;
      if (!opts.palette) this.outerRamps = new Set(pal.ramps);
      try { this.includeHook(path); } finally { if (!opts.palette) { this.pal = pal; this.outerRamps = outer; } }
    };
    env.rng = (seed?: number) => rng(seed);
    // procedural texture, the same in every file: hash(i, j), vnoise(x, y), fbm(x, y, octaves), bayer(x, y)
    env.hash = latticeHash;
    env.vnoise = vnoise;
    env.fbm = fbm;
    env.bayer = bayer;
    env.seamless = seamless;
    // vectors as arrays: vec.add, sub, mul, dot, cross, len, unit
    env.vec = vec;
    // a ground as a polyline: profile([x0, y0, x1, y1, ...])(x) its row there
    env.profile = (pts: unknown) => { try { return profile(pts as number[]); } catch (e) { throw wrap(e).within("profile", this.callerLoc()); } };
    // shapes in meters for solids() and shadows(): solid.stick, blob, box, cone, poly
    env.solid = solid;
    // a model for mesh(): faces, strips, lofts and boxes in meters, each of a material
    // model.turn(faces, c, axis, th, lift) and model.turnPoint(p, ...): a hull on its bob and what rides it
    env.model = Object.assign(() => model(), { turn: turnFaces, turnPoint });
    // fields in 3D, in meters: sdf.sphere(r), .union(...), .bend(k), ... drawn by surface(); sdf.size(field, { view, ppm }) a sprite's size for it
    // sdf.voxels(field, { size, clock }) a voxel grid, sdf.mesh(field, { size, clock }) a mesh by surface nets
    env.sdf = {
      ...sdf, size: surfaceSize,
      voxels: (f: unknown, o: unknown = {}) => { try { return voxelize(f, o as never); } catch (e) { throw wrap(e).within("sdf.voxels", this.callerLoc()); } },
      mesh: (f: unknown, o: unknown = {}) => { try { return surfaceNets(f, o as never); } catch (e) { throw wrap(e).within("sdf.mesh", this.callerLoc()); } },
      splats: (f: unknown, o: unknown = {}) => { try { return makeSplats(f, o as never); } catch (e) { throw wrap(e).within("sdf.splats", this.callerLoc()); } },
      scatter: (f: unknown, o: unknown = {}) => { try { return scatter(f, o as never); } catch (e) { throw wrap(e).within("sdf.scatter", this.callerLoc()); } },
    };
    // make3d.tree({ canopy, twist, wind, ... }) and the rest: builders with semantic parameters (builders.ts);
    // make3d.define(name, fn, { params, wind }) adds the file's own, for its worlds and as make3d.<name>
    const makers: Record<string, (p: Record<string, unknown>) => Built> = { ...BUILDERS };
    const make = (k: string) => (o: unknown = {}) => { try { return makers[k](o as never); } catch (e) { throw wrap(e).within(`make3d.${k}`, this.callerLoc()); } };
    const m3: Record<string, unknown> = Object.fromEntries(Object.keys(BUILDERS).map((k) => [k, make(k)]));
    m3.define = (name: unknown, fn: unknown, o: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(o)) throw new PxError('make3d.define("name", (params) => ({ field }), { params: { size: [0.3, 2] }, wind })');
        checkKeys("make3d.define", o, ["params", "wind"]);
        if (typeof name === "string" && makers[name] && !BUILDERS[name]) throw new PxError(`make3d.${name} is already defined`);
        makers[name as string] = defineBuilder(name, fn, o as never);
        m3[name as string] = make(name as string);
      } catch (e) { throw wrap(e).within("make3d.define", loc); }
    };
    env.make3d = m3;
    // world3d({ seed, wind, parts }): a scene of named parts (world3d.ts); world.edit({ "part.param": v }), world.changed(other)
    env.world3d = (spec: unknown) => { try { return new World(spec as never, makers); } catch (e) { throw wrap(e).within("world3d", this.callerLoc()); } };
    // expect3d(name, world, rules, { frames }): rules over the loop, run by pxl check
    env.expect3d = (name: unknown, world: unknown, rules: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      if (typeof name !== "string" || !(world instanceof World) || !Array.isArray(rules) || !isPlainObject(opts)) throw new PxError('expect3d("name", world, [{ above: ["oak.canopy", "oak.trunk"] }, { on: ["rock", "ground"] }, ...], { frames })', loc);
      checkKeys(`expect3d '${name}'`, opts, ["frames", "ms"], loc);
      this.expects.push({ name, world, rules: rules as Rule[], frames: (opts as { frames?: number }).frames ?? 8, ms: (opts as { ms?: number }).ms ?? 3600, loc });
    };
    // export3d(name, grid or mesh, { mats, as }): .vox, .obj, .glb written by build; a function of the
    // clock and frames: n, the loop's moments (an animated .glb, a file a moment for the others)
    env.export3d = (name: unknown, thing: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      const USAGE = 'export3d("name", sdf.voxels(field, { size }), sdf.mesh(field, { size }) or sdf.splats(field, { spacing }), { mats: { name: ramp }, as: ["vox"], ["obj", "glb"] or ["ply"] }), or a function of the clock, (c) => sdf.mesh(field, { size, clock: c }), with { frames: n, fps }';
      if (typeof name !== "string" || !name || !isPlainObject(opts)) throw new PxError(USAGE, loc);
      checkKeys(`export3d '${name}'`, opts, ["mats", "as", "frames", "fps"], loc);
      const { mats = this.look3d?.mats ?? {}, frames, fps = 8 } = opts as { mats?: Record<string, unknown>; frames?: number; fps?: number };
      const kind = (t: unknown) => (t instanceof Voxels ? "a grid" : t instanceof Mesh3 ? "a mesh" : t instanceof Splats ? "splats" : undefined);
      let make: ((f: number) => unknown) | undefined;
      if (typeof thing === "function") {
        if (!(Number.isInteger(frames) && frames! >= 2) || !(fps > 0)) throw new PxError(`export3d '${name}': a function of the clock is made at frames: n moments of its loop (2 or more, fps 8 unless given), got ${JSON.stringify({ frames, fps })}`, loc);
        const f0 = thing as (c: unknown) => unknown;
        make = (f) => { const t = f0({ t: (f * 1000) / fps, phase: f / frames!, frame: f, frames }); if (kind(t) !== kind(first)) throw new PxError(`export3d '${name}': its function gave ${kind(t) ?? JSON.stringify(t)} at frame ${f}, ${kind(first)} at frame 0`, loc); return t as Voxels | Mesh3 | Splats; };
        const first = f0({ t: 0, phase: 0, frame: 0, frames });
        thing = first;
      } else if (frames !== undefined) throw new PxError(`export3d '${name}': frames is for a function of the clock, (c) => sdf.mesh(field, { size, clock: c })`, loc);
      if (!kind(thing)) throw new PxError(USAGE, loc);
      const T = thing as Voxels | Mesh3 | Splats, as = ((opts as { as?: unknown }).as ?? (T instanceof Voxels ? ["vox"] : T instanceof Splats ? ["ply"] : ["obj", "glb"])) as unknown;
      const splat = T instanceof Splats;
      if (!Array.isArray(as) || !as.length || as.some((f) => !["vox", "obj", "glb", "ply"].includes(f)) || (!(T instanceof Voxels) && as.includes("vox")) || splat !== as.includes("ply") || (splat && as.length > 1))
        throw new PxError(`export3d '${name}': as is a list of "vox" (a voxel grid), "obj", "glb" (a grid or a mesh), or ["ply"] (splats), got ${JSON.stringify(as)}`, loc);
      // each material's color: a light middle tone of its ramp (what another tool lights itself)
      const paint = (t: Voxels | Mesh3 | Splats) => {
        const ramps = t.mats.map((m) => {
          const spec = mats[m] ?? Object.values(mats)[0] ?? this.pal.ramps[0];
          const keys = typeof spec === "string" ? [...spec] : Array.isArray(spec) ? spec : isPlainObject(spec) && "ramp" in spec ? [...(spec as { ramp: string })["ramp"]] : undefined;
          const cs = (keys ?? []).map((k) => this.pal.resolve(k));
          if (!cs.length || cs.some((c) => c === null || c === undefined)) throw new PxError(`export3d '${name}': material '${m || "(none)"}' needs a ramp in mats (it has: ${Object.keys(mats).join(", ") || "none"})`, loc);
          return cs as Color[];
        });
        return { ramps, colors: ramps.map((r) => r[Math.ceil((r.length - 1) * 0.6)]) };
      };
      const { colors, ramps } = paint(T);
      if (this.models.some((x) => x.name === name)) throw new PxError(`export3d '${name}' is already defined`, loc);
      // the other moments made when build writes them (check and shot don't)
      const moments = make ? () => Array.from({ length: frames! }, (_, f) => (f ? make!(f) : T)) as (Voxels | Mesh3 | Splats)[] : undefined;
      this.models.push({ name, thing: T, colors, ramps, as: as as ("vox" | "obj" | "glb" | "ply")[], loc, ...(moments ? { frames: moments, fps, paint } : {}) });
    };
    // look3d({ light, mats }): what the 3D ops (mesh's light, surface, voxels, volume, splats, decal, draw3d, export3d) take when a call doesn't say it
    env.look3d = (o: unknown) => {
      const loc = this.callerLoc(), L = (o ?? {}) as { light?: unknown; mats?: unknown };
      if (!isPlainObject(o)) throw new PxError("look3d({ light: [x, y, z], mats: { name: ramp } }): the 3D ops' light and materials when a call doesn't give them", loc);
      checkKeys("look3d", o, ["light", "mats"], loc);
      if (L.light !== undefined && !(Array.isArray(L.light) && L.light.length === 3 && L.light.every(Number.isFinite))) throw new PxError(`look3d: light is the way toward it, [x, y, z], got ${JSON.stringify(L.light)}`, loc);
      if (L.mats !== undefined && !isPlainObject(L.mats)) throw new PxError(`look3d: mats is { name: ramp }, got ${JSON.stringify(L.mats)}`, loc);
      this.look3d = { ...this.look3d, ...(L.light ? { light: L.light as number[] } : {}), ...(L.mats ? { mats: L.mats as Record<string, unknown> } : {}) };
    };
    // perspective({ w, horizon, eye, fov | focal, vp, yaw, pitch }) or ({ w, h, pitch, fov, ppm }): ground(x, z, up), at(col, row), scale(z, x, up), vanish(angle), vertical(), aim(mid, up)
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

    for (const name of [...OPS, "clip", "lighting", "glow", "post"]) {
      env[name] = (...args: unknown[]): Op => {
        const loc = this.callerLoc();
        try {
          checkArgs(name, args);
          const o = name === "mesh" ? args[3] : name === "surface" || name === "voxels" || name === "volume" || name === "splats" || name === "draw3d" ? args[1] : args[args.length - 1];
          if (OP_OPTS[name] && isPlainObject(o)) checkKeys(name, o, OP_OPTS[name]);
        } catch (e) { throw wrap(e).within(name, loc); }
        if (name === "clip") checkItems("clip", args.slice(1), loc);
        // post's lut names a .cube file next to the art file: read once, here
        if (name === "post" && isPlainObject(args[0]) && args[0].lut !== undefined) {
          try { args = [{ ...args[0], lut: this.cube(args[0].lut) }]; } catch (e) { throw wrap(e).within(name, loc); }
        }
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
    // ability(phases, opts) and emitter(opts): a spell's phases on the clock, and seeded particles (vfx.ts)
    env.ability = (phases: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError("ability(phases, { start, events })");
        checkKeys("ability", opts, ["start", "events"]);
        return ability(phases as never, opts as never);
      } catch (e) { throw wrap(e).within("ability", loc); }
    };
    // route(opts, steps): a figure's legs and holds on the clock; turnToward(anim, at, target, opts): one turning to another (vfx.ts)
    env.route = (opts: unknown, steps: unknown) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError("route({ pace, origin, ground, climb, walk, idle, loop, round }, [[x, z], ...steps])");
        checkKeys("route", opts, ["pace", "origin", "ground", "climb", "walk", "idle", "loop", "round"]);
        return route(opts as never, steps as never);
      } catch (e) { throw wrap(e).within("route", loc); }
    };
    env.turnToward = (anim: unknown, at: unknown, target: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError('turnToward("mo_idle", [x, z], target, { every, rest, within, from, frame })');
        checkKeys("turnToward", opts, ["every", "rest", "within", "from", "frame"]);
        return turnToward(anim as never, at as never, target, opts as never);
      } catch (e) { throw wrap(e).within("turnToward", loc); }
    };
    // tween(keys, { moments }): values keyed in time, at(t); unroll(runs): [frames, value] runs as a value a frame (vfx.ts)
    env.tween = (keys: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError('tween([{ t: 0, ...values }, { t: 4, ... }], { moments: ["smear"] })');
        checkKeys("tween", opts, ["moments"]);
        return tween(keys as never, opts as never);
      } catch (e) { throw wrap(e).within("tween", loc); }
    };
    env.unroll = (runs: unknown) => { try { return unroll(runs as never); } catch (e) { throw wrap(e).within("unroll", this.callerLoc()); } };
    env.follow = (values: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError("follow(values, { damp, peak })");
        checkKeys("follow", opts, ["damp", "peak"]);
        return follow(values as number[], opts as never);
      } catch (e) { throw wrap(e).within("follow", loc); }
    };
    env.emitter = (opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError("emitter({ at, rate | burst, from, to, life, speed, angle, spread, gravity, drag, loop, seed })");
        checkKeys("emitter", opts, ["at", "rate", "burst", "from", "to", "life", "speed", "angle", "spread", "gravity", "drag", "loop", "seed"]);
        return emitter(opts as never);
      } catch (e) { throw wrap(e).within("emitter", loc); }
    };
    // spell(element, tier, { from, to, ... }): a whole cast of an element at a tier (spells.ts), drawn by cast()
    env.spell = (el: unknown, tier: unknown, opts: unknown = {}) => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError('spell("fire", 1 | 2 | 3, { from: [x, y], to: [x, y], ground, start, seed, ... })');
        checkKeys("spell", opts, SPELL_OPTS);
        return spell(el as never, tier as never, opts as never);
      } catch (e) { throw wrap(e).within("spell", loc); }
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
  /** post()'s lut: "dusk.cube" or a strip "dusk.png" (a file next to the art file), or { cube: "dusk.cube", amount }, read into a LUT once. */
  cube(spec: unknown): Lut | { cube: Lut; amount?: number } {
    const file = typeof spec === "string" ? spec : isPlainObject(spec) && typeof spec.cube === "string" ? spec.cube : undefined;
    if (file === undefined) throw new PxError(`lut is a .cube file ("dusk.cube") or a LUT strip ("dusk.png", 256x16), or { cube: "dusk.cube", amount (0..1) }, got ${JSON.stringify(spec)}`);
    if (isPlainObject(spec)) checkKeys("lut", spec, ["cube", "amount"]);
    const strip = /\.png$/i.test(file);
    if (!(strip ? this.pngHook : this.readHook)) throw new PxError(`${strip ? "LUT strips" : ".cube files"} need an art file on disk`);
    let lut = this.cubes.get(file);
    if (!lut) this.cubes.set(file, (lut = strip ? readStrip(this.pngHook!(file), file) : readCube(this.readHook!(file), file)));
    return typeof spec === "string" ? lut : { ...(spec as object), cube: lut };
  }
  private cubes = new Map<string, Lut>();

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
    // an anim of one frame is still: its clock (8 fps unless it says) doesn't join the loop of what
    // places it (with a scene at 12 fps, 125 ms and 83 ms made a 1 ms step and a 60,000-frame loop);
    // and if its code reads its frame or phase, it was meant to move: say so
    const oneFrame = !!tl && def?.kind === "anim" && Math.round(tl.loop / tl.step) <= 1 && (tl.durations?.length ?? 1) <= 1;
    if (oneFrame && def && readsClock(def.items))
      this.warn(`anim '${name}' has one frame (no frames: and no frame() items) but its code reads c.frame or c.phase: it draws frame 0 only and never moves; give it frames: N and the fps of the loop it belongs to (the scene's other anims')`, def.loc);
    if (tl && !oneFrame && track && this.collect.length) {
      const acc = this.collect[this.collect.length - 1];
      if (tl.capped || (acc.loop && lcm(acc.loop, tl.loop) > MAX_LOOP)) acc.capped = true;
      acc.loop = acc.loop ? Math.min(MAX_LOOP, lcm(acc.loop, tl.loop)) : tl.loop;
      acc.step = acc.step ? gcd(acc.step, tl.step) : tl.step;
    }
    if (!tl || t === 0) return first;
    const tt = tl.once ? Math.min(Math.max(0, t), tl.loop) : ((t % tl.loop) + tl.loop) % tl.loop;
    return tt === 0 ? first : this.buildAt(name, seed, tt, def?.kind !== "anim" ? tl : undefined);
  }

  /** Drop a build at time t from the cache (a scene's frame checked once: kept, it would push out the anims its frames share). */
  forget(name: string, t: number): void {
    const tl = this.cache.get(name)?.anim;
    if (!tl || !t) return;
    const tt = tl.once ? Math.min(Math.max(0, t), tl.loop) : ((t % tl.loop) + tl.loop) % tl.loop, key = `${name}#${tt}`, v = this.timed.get(key);
    if (v) { this.timed.delete(key); this.timedBytes -= v.bytes; }
  }
  /** Does another asset name this one (stamps it, as a zoom on a scene does)? Read off its ops and its functions' code. */
  named(name: string): boolean {
    const quoted = [`"${name}"`, `'${name}'`, `\`${name}\``], says = (f: unknown) => quoted.some((q) => String(f).includes(q));
    const has = (items: Item[]): boolean => items.some((v) => typeof v === "function" ? says(v) : isLayer(v) ? has(v.items) : isOp(v) ? v.args.some((a) => a === name || (Array.isArray(a) && has(a as Item[])) || (typeof a === "function" && says(a))) : false);
    return [...this.assets.values()].some((d) => d.name !== name && has(d.items));
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
    // a scene may keep a clock of its own, as an anim does ({ frames, fps }): its functions read it
    // (c.t, c.frame), and the anims it stamps join it (one stamped at a frame it picks doesn't)
    if (def.kind === "scene" && def.opts.frames !== undefined) {
      const fps = def.opts.fps ?? 8, n = Math.floor(def.opts.frames);
      if (!(fps > 0) || !(n >= 1)) throw new PxError(`scene '${name}': frames must be 1 or more and fps above 0, got frames ${def.opts.frames}, fps ${fps}`);
      acc.step = Math.round(1000 / fps); acc.loop = n * acc.step;
    }
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
