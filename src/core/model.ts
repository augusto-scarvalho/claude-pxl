// The data an art file produces. Definitions are plain data + closures; nothing is drawn
// until build time, so references between assets are order-independent.
import type { Palette } from "./palette.ts";
import type { Img } from "./image.ts";
import type { Canvas } from "./canvas.ts";
import type { Region } from "./util.ts";

/** A drawing op recorded with where it was written. */
export interface Op {
  __op: true;
  name: string;
  args: unknown[];
  loc?: string;
}

export interface LayerOpts {
  x?: number;
  y?: number;
  /** Draw this layer's stamps sorted: "y" by where they stand (top-down props), "z" by their z option. */
  sort?: "y" | "z";
  hidden?: boolean;
  /** Blend layer: instead of drawing, step what's below darker/lighter where this layer is opaque. */
  shade?: boolean | number | Record<string, string>;
  light?: boolean | number | Record<string, string>;
  /** A shade layer drawing the shadows of these layers' stamps and tiles, their functions' too (`shadow: false` leaves one out, `shadow: k` its own cast), cast by `cast` ("sun": look3d()'s light, on a world seen from above), but those named in `except`. */
  of?: string | string[];
  cast?: [number, number] | { from: number[]; len?: number } | "sun";
  except?: string[];
  /** Fraction (0..1) of a blend layer's pixels that apply (ordered dither). */
  density?: number;
  /** Color math with what's below, as image editors do: new colors, outside the palette. */
  blend?: "normal" | "multiply" | "screen" | "add" | "overlay";
  /** 0..1: how much of the layer (or of its blend) shows. New colors too. */
  opacity?: number;
  /** With blend / opacity: snap the results to the nearest keyed palette color. */
  palettize?: boolean;
  /** Opaque pixels block light (lighting()). */
  solid?: boolean;
  /** Opaque pixels are back walls: they stop sky light from entering but let light pass. */
  wall?: boolean;
  /** Pixels this layer leaves visible ignore lighting (skies, backdrops). */
  unlit?: boolean;
  /** false: the asset's outline isn't drawn around this layer's pixels (1 px ropes, pegs, smears). */
  outline?: false;
  /**
   * Reference / guide layer: previews show it over the art (true = full strength, 0..1 = that
   * strength over drawn pixels); the exported PNG, sheets and stamps of this asset leave it out.
   * For drawing over a skeleton, a mannequin or a reduced original.
   */
  ref?: boolean | number;
}

export interface Layer {
  __layer: true;
  name: string;
  opts: LayerOpts;
  items: Item[];
  loc?: string;
}

/** Body items: grid strings, ops, custom functions, layers. */
export type Item = string | Op | Layer | ((c: Canvas) => void);

export interface AssetOpts {
  w?: number;
  h?: number;
  base?: string;
  mx?: boolean | "c";
  my?: boolean | "c";
  swap?: Record<string, string>;
  flip?: "x" | "y" | "xy";
  rot?: 90 | 180 | 270;
  /** Any angle, clockwise, before the outline: quarter turns exact, small angles shear, the rest RotSprite. */
  angle?: number;
  /** How `angle` turns it: "auto" (default), "rotsprite", "shear", "nearest". */
  rotate?: "auto" | "rotsprite" | "shear" | "nearest";
  outline?: string;
  outline8?: string;
  /**
   * 1px line on the sprite's own edge pixels; the canvas keeps its size. `{ color, keep }` leaves
   * edge pixels in the `keep` keys as they are, closing only the gaps of an outline that is
   * already there (a reduced image's surviving outline, selective colors included).
   */
  inline?: string | { color: string; keep?: string };
  /** The outline/inline takes the color it touches, n steps darker along the ramps (true = 2). */
  selout?: boolean | number;
  /** each straight run of the edge's line ends a step darker where it steps on diagonally (true: 1 step) */
  caps?: boolean | number;
  /** Anti-alias the inner edges: on each step of 2 px and more, a strip half its length in the key between. */
  aa?: boolean;
  crop?: boolean;
  /** Also export each layer as its own PNG. */
  layers?: boolean;
  /** Point that stamp/scatter/wire hangs place: "bottom" / "center" of the final image, or [x, y] in drawing coords. */
  pivot?: "bottom" | "center" | [number, number];
  /** Named points in drawing coords that other placements attach to (stamp ..., { at: "name.socket" }). */
  sockets?: Record<string, [number, number]>;
  /** Seamless tile: drawing past these edges continues on the other side; previews repeat 3x3. */
  wrap?: boolean | "x" | "y";
  /** 9-slice margins of the final image (n, or [left, top, right, bottom]) for panel(). */
  slice?: number | [number, number, number, number];
  /** Start from a PNG file (path relative to the art file); anims with `frames` split it into a strip. */
  png?: string;
  /** With `png`: its normal map (a PNG laid out as it, green up: pxl's own _n.png, Sprite Fusion's), read as data. */
  normals?: string;
  /** Only this part of the PNG: [x, y, w, h]. */
  area?: [number, number, number, number];
  /** Snap the PNG's colors to the nearest keyed palette color. */
  palettize?: boolean;
  /**
   * Shrink the PNG by this whole factor: each n x n block becomes its most common opaque color
   * (ties: the first, scanning the block column by column), or transparent when fewer than half
   * of its pixels are opaque. Applied after `area`.
   */
  shrink?: number;
  /** Scene background color. */
  bg?: string;
  /** Scene: false and check skips it (an HD render of a scene checked at its own size); { every: n } checks one frame in n (a long story). */
  check?: boolean | { every: number };
  /** Scene: px to an art pixel (w and h are the picture's): mesh(), the 3D ops, meshSocket() and post() draw that many times as big. */
  pixel?: number;
  /** Scene: the same scene k times as big under other names ({ name_hd: 4 }), not checked; post() runs only there. */
  sizes?: Record<string, number>;
  /** anim: default frame rate (frames per second, default 8). */
  fps?: number;
  /** anim: a frame's duration in ms instead of fps, or each frame's ([200, 200, 400]: as many frames); a frame()'s own ms wins. */
  ms?: number | number[];
  /** anim: frame count when there are no frame() items (procedural, via c.frame / c.phase). */
  frames?: number;
  /** anim: false = play once and hold the last frame (default true). */
  loop?: boolean;
  /** anim: playback direction, as Aseprite tags have it (default "forward"). */
  dir?: "forward" | "reverse" | "pingpong";
  /** Which way it faces as drawn: "right", "left", "front" (toward us) or "back". Flips and turns follow it; describe reports it. */
  facing?: "right" | "left" | "front" | "back";
  /** Its real height in meters, for a scene's `world` scale (describe says how tall it should be where it stands). */
  height?: number;
  /**
   * Also the asset facing the other way, under this name: its items drawn mirrored before they are lit,
   * so relight lights it from where the light really is (a flip would carry the light across); pivot,
   * sockets and facing mirrored. Art functions see `c.mirrored`. text, bump and normals refuse.
   */
  twin?: string;
  /**
   * Register every frame by a marked point (the pelvis): the drawing moves sideways so the pixel of
   * this key lands on `x` (default the middle); y is left alone (the bob). A key used for nothing else,
   * best in a `ref: true` layer (else erased from the art once found).
   */
  register?: string | { key: string; x?: number };
  /** Scene: the world's scale, { horizon, eye } (ground seen in perspective) or { scale } (px per meter, flat side view). */
  world?: World;
}

/**
 * A scene's world scale. Ground in perspective: the horizon's row and the eye's height in meters
 * (a thing standing on row y is (y - horizon) / eye px per meter). Flat side view: px per meter.
 */
export interface World {
  horizon?: number;
  eye?: number;
  scale?: number;
  /**
   * Where the scene's light comes from, [x, y] (e.g. [0.6, -1]: the top right), or a point light in
   * the scene, { at: [x, y] } (a fire, a lamp): each object's lit side is checked against it (against
   * the way from the object to the point). Without it, each object is read against the strongest
   * lamp its lighting() lit it by, or a sprite in mesh() against the mesh's light; false: not read.
   */
  light?: [number, number] | { at: [number, number] } | false;
  /** A flat world (`scale`) seen from above, a map whose up is away (a top-down RPG's); "side" (default) from the side. */
  view?: "top" | "side";
  /**
   * Flat side view: the ground's row, or a profile [x0, y0, x1, y1, ...] (a cave's floor), or several (the
   * floor, then ledges over it, each over its own span): what stands (has a height) is checked for
   * floating or sinking against the one nearest its feet; `stamp(name, x, "ground")` stands on the first.
   */
  ground?: number | number[] | number[][];
}

export type AssetKind = "sprite" | "scene" | "anim";

/** Options of a frame() item inside an anim. */
export interface FrameOpts {
  /** Duration in ms (default 1000 / fps). */
  ms?: number;
  /** Duration in frames of the anim's fps (2 = twice as long). */
  hold?: number;
}

/**
 * How an asset changes over time. Anims know their own frame durations; anything that places an
 * anim (sprites, scenes) inherits a combined loop and step.
 */
export interface Timeline {
  /** Loop length in ms. */
  loop: number;
  /** Time resolution in ms: frames change at multiples of this. */
  step: number;
  /** Own frame durations in ms, in playback order (anims only). */
  durations?: number[];
  /** reverse / pingpong anims: the drawn frame shown at each playback position. */
  order?: number[];
  dir?: "reverse" | "pingpong";
  /** anim loop: false (holds the last frame). */
  once?: boolean;
  /** The placed anims' loops don't line up: their combined loop was cut at the 60s maximum. */
  capped?: boolean;
}

export interface AssetDef {
  kind: AssetKind;
  name: string;
  opts: AssetOpts;
  items: Item[];
  pal: Palette;
  loc?: string;
  /** Where the top-level statement that defined it makes its call (a loop's, a helper's caller): `pxl list` groups by it. */
  top?: string;
  /** The decoded `png` option (its `area` applied), read when the art file ran. */
  png?: Img;
  /** A twin: the items of the asset it was made from, drawn mirrored (before lighting). */
  mirror?: boolean;
  /** look3d()'s light and mats when it was defined. */
  look3d?: { light?: number[]; mats?: Record<string, unknown> };
  /** Drawn in 3D standing on its origin (turnaround(), rig3d()): its pivot is where it meets the ground. */
  grounded?: boolean;
}

export interface GroupDef {
  name: string;
  members: string[];
  loc?: string;
}

export interface SheetOpts {
  cols?: number;
  pad?: number;
  /** Repeat each frame's edge pixels this many px outward (texture bleeding in engines). */
  extrude?: number;
  /** "tag": each animation starts a row of its own (`cols` still wraps a long one). */
  rows?: "tag";
}

export interface SheetDef {
  name: string;
  entries: string[];
  opts: SheetOpts;
  loc?: string;
}

/** Options for stamp / tile / pattern / tilemap / scatter / wire hangs. */
export interface PlaceOpts {
  /** Of a group or glob, the member whose drawing is nearest this height in px (sizes of one thing). */
  fit?: number;
  flip?: "x" | "y" | "xy";
  rot?: 90 | 180 | 270;
  swap?: Record<string, string>;
  /** Random flips per placement. */
  rflip?: "x" | "y" | "xy";
  /** Random recolor per placement; {} = keep. */
  rswap?: Record<string, string>[];
  /** The copy n steps darker along the palette's ramps (negative: lighter): a far limb; swap wins for the keys it names. */
  shade?: number;
  /** Paint every opaque pixel this color: hit flashes, cast shadows, silhouettes. */
  silhouette?: string;
  /** Lay the asset flat on the ground as its shadow: a pixel h above the base lands h * [kx, ky] away; stamp: or away from a light, `{ from: [x, y] or [x, y, h], len? }`. */
  cast?: [number, number] | { from: number[]; len?: number };
  /** In a layer a shade layer casts (`of`): false, no shadow; its own cast instead of the layer's. */
  shadow?: false | [number, number] | { from: number[]; len?: number } | "sun";
  /**
   * Where `cast` measures heights from: "pivot" (default), the pivot's row; "column", each column's
   * own lowest pixel (a base that isn't level: a tent seen at an angle, a crate on a slope).
   */
  castBase?: "pivot" | "column";
  /** Effects on this copy alone: ["dissolve", { progress }] or a list of them, on the canvas's clock. */
  fx?: unknown;
  /** Attach to a socket of an earlier placement in this asset: "id.socket"; x, y become an offset from it. */
  at?: string;
  /** Name this placement for `at` (default: the asset name). */
  id?: string;
  /** Draw order in a layer with sort: "z" (default 0; ties keep call order). */
  z?: number;
  seed?: number;
  /** Rebuild the placed asset with its own random choices (true = derived from position). */
  reseed?: boolean | number;
  /** Of a family named by the compass (name_n, name_ne, ...), the member nearest this heading: compass degrees (0 away, 90 right) or [dx, dz] on the ground. */
  heading?: number | [number, number];
  /** Animated assets: show this frame index, frozen. */
  frame?: number;
  /** Animated assets: show it as it is this many ms into its own loop (its frames' own durations), frozen. */
  t?: number;
  /** Animated assets: start this many ms later (desync copies). */
  delay?: number;
  /** Animated assets: random start time per placement (true), seeded like other picks. */
  rdelay?: boolean;
  /**
   * stamp only: x and y may fall between pixels (subpixel motion: an idle by half pixels); [dx, dy]
   * the way the part moves (1 right / down, -1 left / up; true: [1, 1]). Halfway it stays where it
   * comes from and its edges move: it pushes into its own outline, or spills over what's painted.
   */
  sub?: boolean | [number, number] | { from: [number, number] };
  /** Motion blur: the silhouette swept from where it was ([x, y], as this stamp's x, y) to here, in one key (default its lightest color), under it. */
  smear?: [number, number] | { from: [number, number]; c?: string };
}

export interface ScatterOpts extends PlaceOpts {
  /** Center must land on these keys ("*" = any opaque). */
  on?: string;
  /** Only paint onto `on` pixels. */
  clip?: boolean;
  /** Masks read the composite below the current layer instead of the layer itself. */
  below?: boolean;
  /** Even spacing: one pick per cell of a grid sized to `count`, at a random spot in the cell. */
  even?: boolean;
  /** Center must also be within `within` px (default 2) of these keys: along a path, at a rock's foot. */
  near?: string;
  within?: number;
}

export interface TilemapOpts extends PlaceOpts {
  /** char -> asset; with `corners`, corner mask (0-15) -> asset, or a prefix ("shore_" -> shore_<mask>). */
  map: Record<string, string> | string;
  /**
   * The map marks tile corners, not tiles: these chars (true: any but "." and " ") are set. Each
   * tile's mask is 1 top-left + 2 top-right + 4 bottom-left + 8 bottom-right.
   */
  corners?: boolean | string;
  /** Isometric: cells on a diamond grid of w x h floors, drawn back to front. */
  iso?: boolean;
  size?: number;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
}

/** A tilemap as placed, for exporting the map (Tiled): the image put in each cell, row by row. */
export interface TileLayer {
  name: string;
  iso: boolean;
  cols: number;
  rows: number;
  /** Cell size: the tile size, or the floor diamond's size for iso. */
  tw: number;
  th: number;
  x: number;
  y: number;
  cells: (Img | undefined)[];
}

/** Options of relight(): where the light comes from and which ramps the pixels step along. */
export interface RelightOpts {
  /** Direction the light comes from, [x, y] (default [-0.5, -1]: top-left, mostly from above). */
  light?: [number, number];
  /** Empty space up to this many px away counts as an edge (default 1). */
  reach?: number;
  /** Multiplies the steps (default 1). */
  strength?: number;
  /** Ramps, dark to light, to step along (default: the palette's ramps). */
  ramps?: string[];
  /**
   * Pixels this exposed to the light or more take their ramp's lightest key: a glint on the
   * corners facing it (with the default light, 1.5 = open both above and toward the light's side).
   */
  glint?: number;
}

/** Options of pose(): where the joints land and how they're drawn. */
export interface PoseOpts {
  /** Joint (x, y) -> (x * scale + x, y * scale + y), rounded. */
  x?: number;
  y?: number;
  scale?: number;
  /** Bone color (default "R"). */
  color?: string;
  /** Joint dot color (default "Y"); false: no dots. */
  joint?: string | false;
  /** Skip joints whose score is below this (detectors give one per joint). */
  min?: number;
  /** Color the limbs by side (left arm magenta, right green, left leg orange, right cyan): a swapped limb shows. */
  sides?: boolean;
  /** Pairs of joint names to connect (default: body, head and feet bones). */
  bones?: [string, string][];
}

export interface WireOpts extends PlaceOpts {
  hang?: string;
  every?: number;
  start?: number;
}

export interface LampOpts {
  /** Reach in pixels through open space (default 32). */
  r?: number;
  /** Light color: key or "#hex" (default white). */
  color?: string;
  /** Brightness multiplier at the source (default 1; > 1 overexposes). */
  power?: number;
  /** Height above the picture in px (default 8): lower = more raking light on normal maps. */
  z?: number;
}

export interface BumpOpts {
  /** "dome" (default): blobs bulge; "bevel": edges slope over `w` px; "luma": brighter = higher; "hybrid": the silhouette's volume plus the shading, as Sprite Fusion makes them. */
  shape?: "dome" | "bevel" | "luma" | "hybrid";
  /** Bevel width in px (default 2). */
  w?: number;
  /** Steepness multiplier (default 1; hybrid 1.5, Sprite Fusion's normal strength). */
  depth?: number;
  /** hybrid only, as Sprite Fusion names them: px over which the volume levels off (default 4), its height (1.15), its blur in px (1.15), the shading's weight (6) and blur in px (0.6). */
  shapeRadius?: number;
  shapeStrength?: number;
  shapeSoftness?: number;
  detailStrength?: number;
  detailScale?: number;
  /** Only these keys ("*" any opaque, default): other keys act as the edges (bevel each brick). */
  on?: string;
  /** Only pixels in this region. */
  where?: Region;
}

export interface LightingOpts {
  /** Light-grid cell size in px (default 4): bigger = blockier, Terraria-like. */
  cell?: number;
  /** Minimum light everywhere, 0..1 (default 0). */
  ambient?: number;
  /** Ambient light color (default white). */
  ambientColor?: string;
  /** Sky light level 0..1 for cells open to the sky (default 0 = none). */
  sky?: number;
  skyColor?: string;
  /** How far sky light spreads from open cells, in px (default 24). */
  skyReach?: number;
  /** Fraction of light lost per 8px of solid, 0..1 (default 0.4): brighter light reaches deeper. */
  block?: number;
  /** Interpolate between cells instead of blocky steps. */
  smooth?: boolean;
  /** Keys that ignore lighting (flames, windows, lava). */
  emit?: string;
  /** The emitting pixels (the emit keys, what effect("emit") or a spell marked) light what is round them: reach in px, or { r, power = 1 }. */
  emitLight?: number | { r?: number; power?: number };
  /** Spread shape: "round" (8 neighbours, default) or "diamond" (4, Terraria-like). */
  shape?: "round" | "diamond";
  /** How strongly normal maps (bump / normals) shape the light, 0 = ignore them (default 1). */
  relief?: number;
  /** Direction sky light comes from, [dx, dy] (default [0, -1]: straight down). */
  skyDir?: [number, number];
}

export interface GlowOpts {
  /** Only pixels inside this region glow (the halo itself can spread past it). */
  where?: Region;
  /** Halo radius in px (default 6). */
  r?: number;
  /** Color mode: how strongly the halo brightens what's around, 0..1+ (default 0.5). */
  strength?: number;
  /** Color mode: one tint for the halo instead of each glowing pixel's own color. */
  color?: string;
  /** Quantize the falloff into this many rings (crisp pixel-art halo); 0 = smooth (default). */
  bands?: number;
  /** Ramp mode: step neighbours up to this many shades lighter along the ramps (stays in palette). */
  ramp?: number;
  /** Keys the halo leaves as drawn: what the glowing thing is made of (the logs and stones under flames). */
  keep?: string | string[];
}

export interface TextOpts {
  scale?: number;
  gap?: number;
  lead?: number;
  align?: "l" | "c" | "r";
  shadow?: string;
  /** A font() name; default the built-in 3x5. */
  font?: string;
}

/** bubble(): a dialogue box over a speaker, its look the file's sprites. */
export interface BubbleOpts {
  /** a sprite with slice margins: the box, a 9-slice */
  panel: string;
  /** a sprite under the box down to the point, its top rows over the panel's bottom border */
  tail?: string;
  /** a 9-slice under the title (its left margin a diamond the title starts after) */
  rule?: string;
  /** the prompt in the lower right corner: an anim at frame `t` */
  more?: string;
  font?: string;
  /** the words' key, or [the title's, the lines'] */
  color?: string | [string, string];
  /** the box off to the right of the point (1) or the left (-1) */
  side?: number;
  /** frames since it opened: the prompt's frame */
  t?: number;
  /** its pixel in the art's (0.75: finer at a size); default 1 */
  unit?: number;
  /** px from the panel's edge to the words (7) */
  pad?: number;
}

/** A bitmap font: glyphs in cells of w x h on an asset, in the order of `chars`. */
export interface FontDef {
  name: string;
  asset: string;
  chars: string;
  w: number;
  h: number;
  /** Cells per row on the asset (default: as many as fit its width). */
  cols?: number;
  /** Every glyph as wide as the widest (centered), not trimmed to its own ink. */
  mono?: boolean;
  loc?: string;
}

export type { Region };

export function isOp(v: unknown): v is Op {
  return typeof v === "object" && v !== null && (v as Op).__op === true;
}

export function isLayer(v: unknown): v is Layer {
  return typeof v === "object" && v !== null && (v as Layer).__layer === true;
}
