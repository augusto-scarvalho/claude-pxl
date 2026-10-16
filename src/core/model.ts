// The data an art file produces. Definitions are plain data + closures; nothing is drawn
// until build time, so references between assets are order-independent.
import type { Palette } from "./palette.ts";
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
  hidden?: boolean;
  /** Blend layer: instead of drawing, step what's below darker/lighter where this layer is opaque. */
  shade?: boolean | number | Record<string, string>;
  light?: boolean | number | Record<string, string>;
  /** Fraction (0..1) of a blend layer's pixels that apply (ordered dither). */
  density?: number;
  /** Opaque pixels block light (lighting()). */
  solid?: boolean;
  /** Opaque pixels are back walls: they stop sky light from entering but let light pass. */
  wall?: boolean;
  /** Pixels this layer leaves visible ignore lighting (skies, backdrops). */
  unlit?: boolean;
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
  outline?: string;
  outline8?: string;
  crop?: boolean;
  /** Also export each layer as its own PNG. */
  layers?: boolean;
  /** Point that stamp/scatter/wire hangs place: "bottom" / "center" of the final image, or [x, y] in drawing coords. */
  pivot?: "bottom" | "center" | [number, number];
  /** Scene background color. */
  bg?: string;
  /** anim: default frame rate (frames per second, default 8). */
  fps?: number;
  /** anim: frame count when there are no frame() items (procedural, via c.frame / c.phase). */
  frames?: number;
  /** anim: false = play once and hold the last frame (default true). */
  loop?: boolean;
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
  /** Own frame durations in ms (anims only). */
  durations?: number[];
  /** anim loop: false (holds the last frame). */
  once?: boolean;
}

export interface AssetDef {
  kind: AssetKind;
  name: string;
  opts: AssetOpts;
  items: Item[];
  pal: Palette;
  loc?: string;
}

export interface GroupDef {
  name: string;
  members: string[];
  loc?: string;
}

export interface SheetOpts {
  cols?: number;
  pad?: number;
}

export interface SheetDef {
  name: string;
  entries: string[];
  opts: SheetOpts;
  loc?: string;
}

/** Options for stamp / tile / pattern / tilemap / scatter / wire hangs. */
export interface PlaceOpts {
  flip?: "x" | "y" | "xy";
  rot?: 90 | 180 | 270;
  swap?: Record<string, string>;
  /** Random flips per placement. */
  rflip?: "x" | "y" | "xy";
  /** Random recolor per placement; {} = keep. */
  rswap?: Record<string, string>[];
  seed?: number;
  /** Rebuild the placed asset with its own random choices (true = derived from position). */
  reseed?: boolean | number;
  /** Animated assets: show this frame index, frozen. */
  frame?: number;
  /** Animated assets: start this many ms later (desync copies). */
  delay?: number;
  /** Animated assets: random start time per placement (true), seeded like other picks. */
  rdelay?: boolean;
}

export interface ScatterOpts extends PlaceOpts {
  /** Center must land on these keys ("*" = any opaque). */
  on?: string;
  /** Only paint onto `on` pixels. */
  clip?: boolean;
  /** Masks read the composite below the current layer instead of the layer itself. */
  below?: boolean;
}

export interface TilemapOpts extends PlaceOpts {
  map: Record<string, string>;
  size?: number;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
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
}

export interface TextOpts {
  scale?: number;
  gap?: number;
  lead?: number;
  align?: "l" | "c" | "r";
  shadow?: string;
}

export type { Region };

export function isOp(v: unknown): v is Op {
  return typeof v === "object" && v !== null && (v as Op).__op === true;
}

export function isLayer(v: unknown): v is Layer {
  return typeof v === "object" && v !== null && (v as Layer).__layer === true;
}
