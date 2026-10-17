// Editor support for art files. In a .px.ts file add:
//   /// <reference path="<pxl>/types/pxl.d.ts" />
// The DSL functions are globals while an art file runs.
export {};

declare global {
  type PxColor = string;
  type PxRegion = undefined | null | number[] | ((x: number, y: number) => boolean);
  interface PxOp { readonly __op: true }
  interface PxLayer { readonly __layer: true }
  type PxItem = string | PxOp | PxLayer | ((c: PxCanvas) => void);

  interface PxPlace {
    flip?: "x" | "y" | "xy"; rot?: 90 | 180 | 270; swap?: Record<string, PxColor>;
    rflip?: "x" | "y" | "xy"; rswap?: Record<string, PxColor>[]; seed?: number; reseed?: boolean | number;
    /** Animated assets: freeze on frame n / start later (ms) / random start. */
    frame?: number; delay?: number; rdelay?: boolean;
    /** Paint every opaque pixel this color: hit flashes, cast shadows, silhouettes. */
    silhouette?: PxColor;
    /** Lay the asset flat on the ground as its cast shadow: a pixel h above the base lands h * [kx, ky] away. */
    cast?: [number, number];
    /** Attach to a socket of an earlier stamp in this asset, "id.socket"; x, y become an offset from it. */
    at?: string;
    /** Name this stamp for `at` (default: the asset name). */
    id?: string;
    /** Draw order in a layer with sort: "z" (default 0; ties keep call order). */
    z?: number;
  }
  interface PxScatter extends PxPlace { on?: string; clip?: boolean; below?: boolean; even?: boolean }
  interface PxTilemap extends PxPlace {
    /** char -> asset; with corners, corner mask (0-15) -> asset, or a name prefix ("shore_" -> shore_<mask>). */
    map: Record<string, string> | string;
    /** The map marks tile corners: these chars (true: any but "." and " ") are set; mask 1 TL + 2 TR + 4 BL + 8 BR. */
    corners?: boolean | string;
    iso?: boolean; size?: number; w?: number; h?: number; x?: number; y?: number;
  }
  interface PxRelight { light?: [number, number]; reach?: number; strength?: number; ramps?: string[] }
  interface PxWire extends PxPlace { hang?: string; every?: number; start?: number }
  interface PxText { scale?: number; gap?: number; lead?: number; align?: "l" | "c" | "r"; shadow?: PxColor; font?: string }
  interface PxAssetOpts {
    w?: number; h?: number; base?: string; mx?: boolean | "c"; my?: boolean | "c"; swap?: Record<string, PxColor>;
    flip?: "x" | "y" | "xy"; rot?: 90 | 180 | 270; angle?: number; rotate?: "auto" | "rotsprite" | "shear" | "nearest"; outline?: PxColor; outline8?: PxColor; crop?: boolean; layers?: boolean;
    /**
     * inline: a 1px line over the sprite's own edge; { color, keep: "keys" } leaves edge pixels in
     * those keys alone (closes only the gaps of an outline already there). selout: the line takes
     * the color it touches, n steps darker (true = 2).
     */
    inline?: PxColor | { color: PxColor; keep?: string }; selout?: boolean | number;
    /** Point that stamp / scatter / wire hangs place: "bottom" / "center" of the final image, or [x, y] in drawing coords. */
    pivot?: "bottom" | "center" | [number, number];
    /** Named points in drawing coords (they travel with flips, turns and the outline) that other stamps attach to with { at: "id.socket" }. */
    sockets?: Record<string, [number, number]>;
    /** 9-slice margins of the final image for panel(): n or [left, top, right, bottom]. */
    slice?: number | [number, number, number, number];
    /** Seamless tile: drawing past these edges continues on the other side; previews repeat 3x3. */
    wrap?: boolean | "x" | "y";
    /** Start from a PNG file (relative to the art file); anims with frames split it into a strip. */
    png?: string; area?: [number, number, number, number]; palettize?: boolean;
    /** Shrink the PNG by a whole factor: each block becomes its most common opaque color. */
    shrink?: number;
  }
  interface PxSceneOpts extends PxAssetOpts { w: number; h: number; bg?: PxColor }
  interface PxAnimOpts extends PxAssetOpts { fps?: number; frames?: number; loop?: boolean; dir?: "forward" | "reverse" | "pingpong" }
  interface PxFrame { ms?: number; hold?: number }
  interface PxLayerOpts {
    /** Draw the layer's stamps sorted: "y" by where they stand (top-down props), "z" by their z. */
    sort?: "y" | "z";
    x?: number; y?: number; hidden?: boolean; density?: number; solid?: boolean; wall?: boolean; unlit?: boolean;
    shade?: boolean | number | Record<string, PxColor>; light?: boolean | number | Record<string, PxColor>;
    /** Color math with what's below (new colors, off the palette; palettize snaps them back). */
    blend?: "normal" | "multiply" | "screen" | "add" | "overlay"; opacity?: number; palettize?: boolean;
    /** Reference / guide layer: shown over the art in previews (true, or a 0..1 strength), left out of the exported image. */
    ref?: boolean | number;
  }
  interface PxPose {
    /** Joint (x, y) lands at (x * scale + x, y * scale + y). */
    x?: number; y?: number; scale?: number;
    color?: PxColor; joint?: PxColor | false; min?: number; bones?: [string, string][];
  }

  interface PxLamp { r?: number; color?: PxColor; power?: number; z?: number }
  interface PxBump { w?: number; depth?: number; on?: string; where?: PxRegion }
  type PxBumpShape = "dome" | "bevel" | "luma";
  interface PxLighting {
    cell?: number; ambient?: number; ambientColor?: PxColor; sky?: number; skyColor?: PxColor; skyReach?: number;
    block?: number; smooth?: boolean; emit?: string; shape?: "round" | "diamond";
    relief?: number; skyDir?: [number, number];
  }
  interface PxGlow { where?: PxRegion; r?: number; strength?: number; color?: PxColor; bands?: number; ramp?: number }

  interface PxCanvas {
    readonly w: number; readonly h: number; readonly seed: number;
    /** Time in ms; inside an anim also the frame index, frame count and frame / frames. */
    readonly t: number; readonly frame: number; readonly frames: number; readonly phase: number;
    is(x: number, y: number, keys: string): boolean;
    key(x: number, y: number): string;
    get(x: number, y: number): number;
    rng(seed?: number): () => number;
    /** An asset's size as it would be placed (a group's first member), for layouts. */
    size(name: string): { w: number; h: number };
    clip(where: PxRegion, fn: () => void): void;
    px(x: number, y: number, c: PxColor): void;
    rect(x: number, y: number, w: number, h: number, c: PxColor): void;
    box(x: number, y: number, w: number, h: number, c: PxColor): void;
    line(x0: number, y0: number, x1: number, y1: number, c: PxColor, width?: number): void;
    hline(x: number, y: number, len: number, c: PxColor): void;
    vline(x: number, y: number, len: number, c: PxColor): void;
    circ(cx: number, cy: number, r: number, c: PxColor): void;
    ring(cx: number, cy: number, r: number, c: PxColor): void;
    ellipse(cx: number, cy: number, rx: number, ry: number, c: PxColor, ring?: boolean): void;
    poly(points: number[], c: PxColor): void;
    curve(points: number[], c: PxColor, opts?: { width?: number; closed?: boolean }): void;
    fill(x: number, y: number, c: PxColor): void;
    dither(x: number, y: number, w: number, h: number, c1: PxColor, c2: PxColor, density?: number): void;
    grad(x: number, y: number, w: number, h: number, colors: string | string[], dir?: "v" | "h" | "r", soft?: number): void;
    noise(x: number, y: number, w: number, h: number, colors: string | string[], density?: number, seed?: number, on?: string): void;
    shade(where?: PxRegion, steps?: number, density?: number): void;
    light(where?: PxRegion, steps?: number, density?: number): void;
    relight(where?: PxRegion, opts?: PxRelight): void;
    recolor(map: Record<string, PxColor>, where?: PxRegion, density?: number): void;
    stamp(name: string, x?: number, y?: number, opts?: PxPlace): void;
    tile(name: string, x: number, y: number, cols?: number, rows?: number, opts?: PxPlace): void;
    pattern(name: string, x: number, y: number, w: number, h: number, opts?: PxPlace): void;
    panel(name: string, x: number, y: number, w: number, h: number, opts?: PxPlace): void;
    tilemap(map: string, opts: PxTilemap): void;
    scatter(name: string, x: number, y: number, w: number, h: number, count: number, opts?: PxScatter): void;
    grid(x: number, y: number, str: string): void;
    runs(rows: Record<number, [number, string][]>): void;
    pose(joints: Record<string, number[]>, opts?: PxPose): void;
    wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: PxColor, opts?: PxWire): void;
    text(x: number, y: number, str: string | number, c: PxColor, opts?: PxText): void;
    lamp(x: number, y: number, opts?: PxLamp): void;
    bump(shape?: PxBumpShape, opts?: PxBump): void;
    normals(x: number, y: number, str: string): void;
  }

  /** A built-in palette, a palette file (.hex .gpl .pal .txt, relative to the art file) or a color list. */
  function use(palette: "pico8" | "sweetie16" | "db16" | "endesga32" | "gray8" | `${string}.${"hex" | "gpl" | "pal" | "txt" | "png"}` | (string | number)[]): void;
  function pal(keys: Record<string, string | number>): void;
  function ramps(...darkToLight: string[]): void;
  /** Define keys (dark to light) as hue-shifted shades of `base` and add them as a ramp; base sits at `at` (default the middle). */
  function shades(keys: string, base: PxColor, opts?: { hue?: number; at?: number }): void;
  function sprite(name: string, opts: PxAssetOpts, ...items: PxItem[]): void;
  function sprite(name: string, ...items: PxItem[]): void;
  function scene(name: string, opts: PxSceneOpts, ...items: PxItem[]): void;
  function anim(name: string, opts: PxAnimOpts, ...items: PxItem[]): void;
  function anim(name: string, ...items: PxItem[]): void;
  function frame(opts: PxFrame, ...items: PxItem[]): PxOp;
  function frame(...items: PxItem[]): PxOp;
  function layer(name: string, opts: PxLayerOpts, ...items: PxItem[]): PxLayer;
  function layer(name: string, ...items: PxItem[]): PxLayer;
  function group(name: string, members: string[]): void;
  function sheet(name: string, entries: string[], opts?: { cols?: number; pad?: number; extrude?: number }): void;
  /** A bitmap font from glyphs drawn in w x h cells on a sprite, in the order of `chars`; use it with text(..., { font }). */
  function font(name: string, sprite: string, opts: { chars: string; w: number; h: number; cols?: number }): void;
  /** n directions (sprites name_0.. + group name) from a pose pointing up, via exact quarter turns and diagonal mirrors where possible. See rotation.md. */
  function directions(name: string, n: number, opts: { from: string; outline?: PxColor; outline8?: PxColor; symmetric?: boolean; rotate?: "auto" | "rotsprite" | "shear" | "nearest"; draw?: Record<string, string>; pivot?: "bottom" | "center" | [number, number] }): void;
  /** palette: true keeps the included file's use()/pal()/ramps() active afterwards. */
  function include(path: string, opts?: { palette?: boolean }): void;
  function rng(seed?: number): () => number;
  function clip(where: PxRegion, ...items: PxItem[]): PxOp;

  function px(x: number, y: number, c: PxColor): PxOp;
  function rect(x: number, y: number, w: number, h: number, c: PxColor): PxOp;
  function box(x: number, y: number, w: number, h: number, c: PxColor): PxOp;
  function line(x0: number, y0: number, x1: number, y1: number, c: PxColor, width?: number): PxOp;
  function hline(x: number, y: number, len: number, c: PxColor): PxOp;
  function vline(x: number, y: number, len: number, c: PxColor): PxOp;
  function circ(cx: number, cy: number, r: number, c: PxColor): PxOp;
  function ring(cx: number, cy: number, r: number, c: PxColor): PxOp;
  function ellipse(cx: number, cy: number, rx: number, ry: number, c: PxColor, ring?: boolean): PxOp;
  function poly(points: number[], c: PxColor): PxOp;
  /** A smooth curve through the points (Catmull-Rom), pixel-perfect at width 1; closed loops it. */
  function curve(points: number[], c: PxColor, opts?: { width?: number; closed?: boolean }): PxOp;
  function fill(x: number, y: number, c: PxColor): PxOp;
  function dither(x: number, y: number, w: number, h: number, c1: PxColor, c2: PxColor, density?: number): PxOp;
  function grad(x: number, y: number, w: number, h: number, colors: string | string[], dir?: "v" | "h" | "r", soft?: number): PxOp;
  function noise(x: number, y: number, w: number, h: number, colors: string | string[], density?: number, seed?: number, on?: string): PxOp;
  function shade(where?: PxRegion, steps?: number, density?: number): PxOp;
  function light(where?: PxRegion, steps?: number, density?: number): PxOp;
  /** Volume for flat art: edges facing the light step lighter along their ramp, edges facing away darker. */
  function relight(where?: PxRegion, opts?: PxRelight): PxOp;
  function recolor(map: Record<string, PxColor>, where?: PxRegion, density?: number): PxOp;
  function stamp(name: string, x?: number, y?: number, opts?: PxPlace): PxOp;
  function tile(name: string, x: number, y: number, cols?: number, rows?: number, opts?: PxPlace): PxOp;
  function pattern(name: string, x: number, y: number, w: number, h: number, opts?: PxPlace): PxOp;
  /** 9-slice: an asset with `slice` margins drawn at w x h; corners stay, edges and center repeat. */
  function panel(name: string, x: number, y: number, w: number, h: number, opts?: PxPlace): PxOp;
  function tilemap(map: string, opts: PxTilemap): PxOp;
  function scatter(name: string, x: number, y: number, w: number, h: number, count: number, opts?: PxScatter): PxOp;
  function grid(x: number, y: number, str: string): PxOp;
  /** Runs at absolute x, row by row: { 30: [[19, "3H3"], [23, "deeR"]] }. Same keys as grid. */
  function runs(rows: Record<number, [number, string][]>): PxOp;
  /** A pose skeleton from a detector's JSON file (or a { name: [x, y, score] } map), as a guide. */
  function pose(src: string | Record<string, number[]>, opts?: PxPose): PxOp;
  function wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: PxColor, opts?: PxWire): PxOp;
  function text(x: number, y: number, str: string | number, c: PxColor, opts?: PxText): PxOp;
  function lamp(x: number, y: number, opts?: PxLamp): PxOp;
  function bump(shape?: PxBumpShape, opts?: PxBump): PxOp;
  function normals(x: number, y: number, str: string): PxOp;
  function lighting(opts?: PxLighting): PxOp;
  function glow(keys: string | string[], opts?: PxGlow): PxOp;
}
