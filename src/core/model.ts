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
  /** anim: default frame rate (frames per second, default 8). */
  fps?: number;
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
   * the way from the object to the point).
   */
  light?: [number, number] | { at: [number, number] };
  /** Flat side view: the ground's row; what stands (has a height) is checked for floating or sinking. */
  ground?: number;
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
  /** Paint every opaque pixel this color: hit flashes, cast shadows, silhouettes. */
  silhouette?: string;
  /** Lay the asset flat on the ground as its shadow: a pixel h above the base lands h * [kx, ky] away. */
  cast?: [number, number];
  /**
   * Where `cast` measures heights from: "pivot" (default), the pivot's row; "column", each column's
   * own lowest pixel (a base that isn't level: a tent seen at an angle, a crate on a slope).
   */
  castBase?: "pivot" | "column";
  /** Attach to a socket of an earlier placement in this asset: "id.socket"; x, y become an offset from it. */
  at?: string;
  /** Name this placement for `at` (default: the asset name). */
  id?: string;
  /** Draw order in a layer with sort: "z" (default 0; ties keep call order). */
  z?: number;
  seed?: number;
  /** Rebuild the placed asset with its own random choices (true = derived from position). */
  reseed?: boolean | number;
  /** Animated assets: show this frame index, frozen. */
  frame?: number;
  /** Animated assets: start this many ms later (desync copies). */
  delay?: number;
  /** Animated assets: random start time per placement (true), seeded like other picks. */
  rdelay?: boolean;
  /**
   * stamp only: x and y may fall between pixels (subpixel motion: an idle by half pixels); [dx, dy]
   * the way the part moves (1 right / down, -1 left / up; true: [1, 1]). Halfway it stays where it
   * comes from and its edges move: it pushes into its own outline, or spills over what's painted.
   */
  sub?: boolean | [number, number];
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
  /** "dome" (default): blobs bulge; "bevel": edges slope over `w` px; "luma": brighter = higher. */
  shape?: "dome" | "bevel" | "luma";
  /** Bevel width in px (default 2). */
  w?: number;
  /** Steepness multiplier (default 1). */
  depth?: number;
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
