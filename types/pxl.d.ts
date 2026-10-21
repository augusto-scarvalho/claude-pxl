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
    /** Of a group or glob, the member whose drawing is nearest this height in px (sizes of one thing). */
    fit?: number;
    flip?: "x" | "y" | "xy"; rot?: 90 | 180 | 270; swap?: Record<string, PxColor>;
    rflip?: "x" | "y" | "xy"; rswap?: Record<string, PxColor>[]; seed?: number; reseed?: boolean | number;
    /** Animated assets: freeze on frame n / start later (ms) / random start. */
    frame?: number; delay?: number; rdelay?: boolean;
    /** stamp only: x, y between pixels (subpixel); [dx, dy] the way it moves (1 right/down, -1 left/up). */
    sub?: boolean | [number, number];
    /** stamp only: motion blur, the silhouette swept from where it was ([x, y]) to here, under it, in one key (default its lightest). */
    smear?: [number, number] | { from: [number, number]; c?: PxColor };
    /** Paint every opaque pixel this color: hit flashes, cast shadows, silhouettes. */
    silhouette?: PxColor;
    /** Lay the asset flat on the ground as its cast shadow: a pixel h above the base lands h * [kx, ky] away. */
    cast?: [number, number];
    /** Where cast measures height from: the pivot's row (default), or each column's lowest pixel (a hem or a base that isn't level). */
    castBase?: "pivot" | "column";
    /** Attach to a socket of an earlier stamp in this asset, "id.socket"; x, y become an offset from it. */
    at?: string;
    /** Name this stamp for `at` (default: the asset name). */
    id?: string;
    /** Draw order in a layer with sort: "z" (default 0; ties keep call order). */
    z?: number;
  }
  interface PxScatter extends PxPlace {
    on?: string; clip?: boolean; below?: boolean; even?: boolean;
    /** Center also within `within` px (default 2) of these keys: grass along a path, moss at a rock's foot. */
    near?: string; within?: number;
  }
  interface PxTilemap extends PxPlace {
    /** char -> asset; with corners, corner mask (0-15) -> asset, or a name prefix ("shore_" -> shore_<mask>). */
    map: Record<string, string> | string;
    /** The map marks tile corners: these chars (true: any but "." and " ") are set; mask 1 TL + 2 TR + 4 BL + 8 BR. */
    corners?: boolean | string;
    iso?: boolean; size?: number; w?: number; h?: number; x?: number; y?: number;
  }
  interface PxRelight {
    light?: [number, number]; reach?: number; strength?: number; ramps?: string[];
    /** Pixels at least this exposed (open above and toward the light) take their ramp's lightest key. */
    glint?: number;
  }
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
    inline?: PxColor | { color: PxColor; keep?: string }; selout?: boolean | number; aa?: boolean;
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
    /** Which way it faces as drawn; flips and turns carry it, describe reads it out. A label: the pixels aren't checked. */
    facing?: "right" | "left" | "front" | "back";
    /** Its real height in meters, checked against a scene's `world` scale where it stands. */
    height?: number;
    /** Also the asset facing the other way under this name: drawn mirrored before it is lit, so relight keeps the light where it is. */
    twin?: string;
    /** Register every frame by a marker pixel of this key (the pelvis): moved sideways so it lands on x (default the middle). */
    register?: string | { key: string; x?: number };
  }
  interface PxWorld {
    /** Ground in perspective: the horizon's row and the eye's height in meters; or a flat side view's px per meter. */
    horizon?: number; eye?: number; scale?: number;
    /** Where the light comes from, or a point light in the scene ({ at: [x, y] }: a fire, a lamp): each object's lit side is checked against it. */
    light?: [number, number] | { at: [number, number] };
    /** Flat side view: the ground's row; what has a height is checked for floating or sinking. */
    ground?: number;
  }
  /** A scene takes the transforms, outlines, crop, layers, pivot and wrap; what starts from or labels a drawing is for sprites and anims. */
  interface PxSceneOpts extends Omit<PxAssetOpts, "base" | "png" | "area" | "palettize" | "shrink" | "slice" | "sockets" | "facing" | "height" | "twin" | "register"> { w: number; h: number; bg?: PxColor; world?: PxWorld }
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
    /** false: the asset's outline isn't drawn around this layer's pixels (1px ropes, pegs, smears stay 1px). */
    outline?: false;
  }
  interface PxPose {
    /** Joint (x, y) lands at (x * scale + x, y * scale + y). */
    x?: number; y?: number; scale?: number;
    color?: PxColor; joint?: PxColor | false; min?: number; bones?: [string, string][];
    /** Limbs colored by side: left arm magenta, right green, left leg orange, right cyan. */
    sides?: boolean;
  }

  interface PxSlot {
    /** The joint where the part's pivot lands, and the part's box (its size, and the stand-in's until it is drawn). */
    at: [number, number]; size: [number, number]; pivot?: [number, number];
    /** The body's side: "l" its left, "r" its right; none for the middle. */
    side?: "l" | "r";
    /** Fine order (higher = in front) on top of far -100 / middle 0 / near +100; out: how far outside its limb. */
    z?: number; out?: number;
    /** The part's asset (default "<rig>_<slot>"); on: its joint is a socket of another slot's part ("arm_l.hand"). */
    part?: string; on?: string;
    /** A part with two faces, each its own drawing; the one turned to us shows. */
    faces?: { outer?: string; inner?: string; edge?: string }; facesTo?: "left" | "right" | "front" | "back";
    /** Two of its sockets and two of another slot's whose lines must run parallel. */
    parallel?: [string, string, string, string];
  }
  interface PxRigOpts extends Omit<PxAssetOpts, "base" | "png" | "area" | "palettize" | "shrink" | "flip" | "rot" | "angle" | "mx" | "my"> {
    w: number; h: number; facing: "right" | "left" | "front" | "back";
    slots: Record<string, PxSlot>;
    /** false: stand-ins only (a blocking pass); guide: false leaves out the skeleton ref layer. */
    parts?: boolean; guide?: boolean;
    /** Where the light its parts are drawn under comes from; far: steps darker for the far side's parts. */
    light?: [number, number]; far?: number;
    /** Also the rig facing the other way: its name, or { name, parts: [from, to] } to look its parts up under another prefix. */
    turn?: string | { name: string; parts?: [string, string] };
  }
  interface PxFigure {
    head: number; headW: number; eyes: number; chin: number; shoulders: number; chest: number; elbows: number;
    waist: number; crotch: number; wrists: number; knees: number; ankles: number; sole: number;
    shoulderW: number; hipW: number;
  }

  type PxV3 = [number, number, number];
  /** A shape in meters (made by solid.*): which fields it has says what it is. */
  interface PxSolid {
    a?: PxV3; b?: PxV3; half?: number; e?: PxV3; rx?: number; ry?: number;
    box?: [number, number, number, number, number, number]; keys?: Record<string, PxColor>;
    cone?: [PxV3, number, PxV3, number]; wrap?: [PxV3, number][]; poly?: PxV3[]; key?: PxColor;
    /** drawn a little nearer than its middle (a face over a head) */
    top?: number;
    /** casts a shadow but isn't drawn */
    ghost?: boolean;
    /** drawn but casts nothing */
    noShadow?: boolean;
    /** the share of its shadow that is shade (a crown with sun flecks) */
    dapple?: number;
  }
  /** The sun: the way toward it along the ground [x, z], how high it stands in degrees. */
  interface PxSun { from: [number, number]; up: number }
  interface PxClouds {
    /** The base row, the px between clouds, a cloud's width and height. */
    y: number; gap: number; w: number; h: number;
    n?: number; seed?: number; keys?: string; x?: number; empty?: number[]; sizes?: number[]; frame?: number;
  }
  interface PxPlume {
    every?: number; life?: number; rise?: number; wind?: number | [number, number]; inertia?: number;
    size?: [number, number]; young?: string; seed?: number; frame?: number; light?: [number, number];
  }
  interface PxSolidOpts {
    /** where the eye stands in the world [x, z] (default 0, 0) */
    at?: [number, number];
    sun?: PxSun;
    /** px per meter at a world point (default the camera's own) */
    scale?: (x: number, z: number) => number;
    /** drawn on a plate lit along these ramps, the light from `light` on screen */
    ramps?: string[]; light?: [number, number];
    shade?: Record<string, PxColor>;
  }
  /** A flat face of a model, its corners in meters. */
  interface PxFace { mat: string; pts: PxV3[] }
  /** How a material is drawn by mesh(): its tones dark to light, the outline, the lit top edge, no creases on a round surface, a lift to its light, a dither between tones, a texture stepping the tone per pixel. */
  interface PxMaterial { ramp: string | PxColor[]; edge?: PxColor; top?: PxColor; smooth?: boolean; bias?: number; dither?: number; texture?: (x: number, y: number) => number }
  /** mesh()'s light: the way toward it in the points' frame, or a face's light (0 dark, 1 lit) from its normal toward the eye, its middle, the face. */
  interface PxMeshOpts { light?: PxV3 | ((normal: PxV3, middle: PxV3, face: PxFace) => number) }
  /** A camera of one's own for mesh(): a point in the camera's frame (x right, y up, z ahead, from the eye) to [col, row, depth]. */
  type PxProject = (p: PxV3) => [number, number, number];
  /** terrain()'s options: how far to look (m), the land's highest point, a cheap height it never rises more than `margin` above, the sky's color where a pixel sees no land. */
  interface PxTerrainOpts {
    far?: number; top?: number; bound?: (x: number, z: number) => number; margin?: number;
    sky?: (col: number, row: number) => PxColor | null | undefined;
  }
  /** A pinhole camera over flat ground, in meters: the horizon's row, the eye's height, a field of view. */
  interface PxView {
    w?: number; horizon: number; eye: number; fov?: number; focal?: number;
    /** The column the camera looks at (default the middle). */
    vp?: number;
    /** Degrees the camera is turned right of the world's z axis: two-point perspective (default 0). */
    yaw?: number;
    /** Degrees the camera is tilted up, down if negative: three-point perspective (default 0). */
    pitch?: number;
    /** The way's curvature (1/m): its z lines bend right (left if negative), a point z m along bend·z²/2 m to the side (default 0). */
    bend?: number;
  }
  interface PxPerspective {
    readonly w: number; readonly horizon: number; readonly eye: number; readonly focal: number; readonly vp: number; readonly yaw: number; readonly pitch: number; readonly bend: number;
    /** Where a point x m across, z m ahead and up m above the ground lands on screen (not rounded). */
    ground(x: number, z: number, up?: number): [number, number];
    /** The ground point [x, z] seen through a pixel's center; null at the horizon and above. */
    at(col: number, row: number): [number, number] | null;
    /** px per meter at a point z m ahead (and x m across, which matters once turned; up m high, once tilted). */
    scale(z: number, x?: number, up?: number): number;
    /** The column where ground lines heading `angle` degrees right of z meet (0: z lines, 90: x lines). */
    vanish(angle?: number): number;
    /** Where uprights meet, [col, row]: above the picture tilted up, below tilted down; null when level. */
    vertical(): [number, number] | null;
    /** The way a pixel's middle looks, as a unit [x, z, up] in the world (sky by direction, marching a ray). */
    ray(col: number, row: number): [number, number, number];
    /** Where a direction [x, z, up] lands on screen, [col, row]: the sun, or where lines going that way meet; null behind the eye. */
    toward(dir: [number, number, number]): [number, number] | null;
  }

  interface PxLamp { r?: number; color?: PxColor; power?: number; z?: number }
  interface PxBump { w?: number; depth?: number; on?: string; where?: PxRegion }
  type PxBumpShape = "dome" | "bevel" | "luma";
  interface PxLighting {
    cell?: number; ambient?: number; ambientColor?: PxColor; sky?: number; skyColor?: PxColor; skyReach?: number;
    block?: number; smooth?: boolean; emit?: string; shape?: "round" | "diamond";
    relief?: number; skyDir?: [number, number];
  }
  interface PxGlow {
    where?: PxRegion; r?: number; strength?: number; color?: PxColor; bands?: number; ramp?: number;
    /** Keys the halo leaves as drawn: what the glowing thing is made of (the logs and stones under flames). */
    keep?: string | string[];
  }

  interface PxCanvas {
    readonly w: number; readonly h: number; readonly seed: number;
    /** Time in ms; inside an anim (or a scene animated by what it places) also the frame index, frame count and frame / frames. */
    readonly t: number; readonly frame: number; readonly frames: number; readonly phase: number;
    /** Drawing a twin: every x lands mirrored (for the few choices a mirror doesn't make by itself). */
    readonly mirrored: boolean;
    is(x: number, y: number, keys: string): boolean;
    key(x: number, y: number): string;
    get(x: number, y: number): number;
    rng(seed?: number): () => number;
    /** An asset's size as it would be placed (a group's first member), for layouts. */
    size(name: string): { w: number; h: number };
    clip(where: PxRegion, fn: () => void): void;
    /** Draw on a plate of its own, lit there with relight's opts, then lay it down. */
    plate(fn: () => void, opts?: PxRelight): void;
    /** Draw `fn` on a sheet of its own and lay it down moved by (dx, dy), between pixels too (subpixel). */
    subpixel(dx: number, dy: number, fn: () => void, dir?: [number, number]): void;
    px(x: number, y: number, c: PxColor): void;
    rect(x: number, y: number, w: number, h: number, c: PxColor): void;
    box(x: number, y: number, w: number, h: number, c: PxColor): void;
    line(x0: number, y0: number, x1: number, y1: number, c: PxColor, width?: number): void;
    hline(x: number, y: number, len: number, c: PxColor): void;
    vline(x: number, y: number, len: number, c: PxColor): void;
    circ(cx: number, cy: number, r: number, c: PxColor): void;
    ring(cx: number, cy: number, r: number, c: PxColor): void;
    arc(cx: number, cy: number, r: number, from: number, to: number, c: PxColor, opts?: { inner?: number; taper?: boolean }): void;
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
    /** Gradient map: the region's colors, dark to light, take the ramp's keys in order (hue: only colors of that hue). */
    rampmap(ramp: string | string[], opts?: { where?: PxRegion; hue?: [number, number] }): void;
    /** Move pixels by whole-pixel offsets: fn(x, y) gives [dx, dy] at a pixel's new place; it takes the color (dx, dy) behind it. */
    warp(fn: (x: number, y: number) => [number, number] | null | undefined | false | 0, where?: PxRegion): void;
    /** Flat ground in perspective, row by row: fn(x, z) gives the color at x m across, z m away ("." or nothing: leave it). */
    plane(view: PxView | PxPerspective, fn: (x: number, z: number, col: number, row: number) => PxColor | null | undefined, where?: PxRegion): void;
    /** A tapered capsule painted round (px), shaded across toward the light along `ramp`, a rim on the lit edge. */
    capsule(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, ramp: string, opts?: { light?: [number, number]; rim?: boolean }): void;
    /** Flames rising from (x, y), about `size` px tall, flickering with the frame, leaning with `wind`; `keys` root to tip, the last for edges. */
    flame(x: number, y: number, size: number, keys: string, opts?: { wind?: number; period?: number; seed?: number; frame?: number }): void;
    /** A strip that wraps going by, `per` px a loop (a whole number of its widths): a parallax plane. */
    scroll(name: string, y: number, per: number, opts?: { x?: number; frame?: number }): void;
    /** A lane of cumulus drifting one slot a loop while each turns into the next. */
    clouds(opts: PxClouds): void;
    /** Smoke, steam or dust from a point, in a loop that closes. */
    plume(x: number, y: number, keys: string, opts?: PxPlume): void;
    /** Shapes in meters drawn far to near through the camera (solid.stick, blob, box, cone, poly). */
    solids(view: PxView | PxPerspective, shapes: PxSolid[], opts?: PxSolidOpts): void;
    /** Flat faces in meters (model()) through the camera, the nearest per pixel, toned along their material's ramp, outlined where a surface ends. */
    mesh(view: PxView | PxPerspective | PxProject, faces: PxFace[], mats: Record<string, PxMaterial>, opts?: PxMeshOpts): void;
    /** The same shapes' shadows on the ground, from the sun: each ground color turned into its shade. */
    shadows(view: PxView | PxPerspective, shapes: PxSolid[], opts: PxSolidOpts & { sun: PxSun; shade: Record<string, string> }): void;
    /** Land with relief in perspective, ray-marched: height(x, z) in meters; fn gives the color of the point each pixel sees. */
    terrain(view: PxView | PxPerspective, height: (x: number, z: number) => number, fn: (x: number, z: number, u: number, t: number, col: number, row: number) => PxColor | null | undefined, opts?: PxTerrainOpts): void;
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
  function shades(keys: string, base: PxColor, opts?: { hue?: number; at?: number; sat?: number }): void;
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
  function font(name: string, sprite: string, opts: { chars: string; w: number; h: number; cols?: number; mono?: boolean }): void;
  /** n directions (sprites name_0.. + group name) from a pose pointing up, via exact quarter turns and diagonal mirrors where possible. See rotation.md. */
  function directions(name: string, n: number, opts: { from: string; outline?: PxColor; outline8?: PxColor; symmetric?: boolean; rotate?: "auto" | "rotsprite" | "shear" | "nearest"; draw?: Record<string, string>; pivot?: "bottom" | "center" | [number, number] }): void;
  /** palette: true keeps the included file's use()/pal()/ramps() active afterwards. */
  function include(path: string, opts?: { palette?: boolean }): void;
  function rng(seed?: number): () => number;
  /** A number in [0, 1) for a lattice point (integers): the same (i, j) always gives the same. */
  function hash(i: number, j: number): number;
  /** Smooth value noise in [0, 1], one unit a cell. */
  function vnoise(x: number, y: number): number;
  /** Octaves of vnoise, finer and fainter each, in [0, 1] (default 4): billows, clouds, rock. */
  function fbm(x: number, y: number, octaves?: number): number;
  /** Ordered-dither threshold in (0, 1) for pixel (x, y) (a 4x4 Bayer matrix). */
  function bayer(x: number, y: number): number;
  /**
   * Hair, tails, scarves: a chain fixed at anchors[f] in frame f that follows with lag (inertia,
   * weight, a rest shape), simulated until the loop repeats. Returns per frame [anchor, p1, ...pN].
   */
  function chain(anchors: [number, number][], opts?: {
    links?: number; length?: number; gravity?: [number, number]; drag?: number; rest?: [number, number]; stiff?: number;
    /** Celeste-style: each frame a point covers 1/follow of the way to (the point before + step), never farther than max. */
    follow?: number; step?: [number, number]; max?: number;
    move?: [number, number]; steps?: number; loops?: number;
  }): [number, number][][];
  /** One direction of a motion guide file (examples/motion/walk.json): whole-pixel joints per frame, the floor point moved to `at`. */
  function motion(file: string, opts?: { dir?: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | string; scale?: number; at?: [number, number] }): {
    name: string; dir: string; ms: number[]; frames: Record<string, [number, number]>[]; depth: Record<string, number>[]; contact: [number, number][];
  };
  function clip(where: PxRegion, ...items: PxItem[]): PxOp;
  /** A pinhole camera over flat ground, turned (yaw) and tilted (pitch): ground(x, z, up) -> screen, at(col, row) -> ground, scale(z), vanish(angle), vertical(), ray(col, row), toward(dir). */
  function perspective(view: PxView & { w: number }): PxPerspective;
  /** Flat ground in perspective, row by row: fn(x, z) gives the color at x m across, z m away. */
  function plane(view: PxView | PxPerspective, fn: (x: number, z: number, col: number, row: number) => PxColor | null | undefined, where?: PxRegion): PxOp;
  /** A tapered capsule painted round (px): every pixel shaded across it toward the light along `ramp` (dark to light), a rim on the lit edge. */
  function capsule(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, ramp: string, opts?: { light?: [number, number]; rim?: boolean }): PxOp;
  /** Flames rising from (x, y), about `size` px tall: tongues flickering with the frame, leaning with `wind`; `keys` from the root to the tip, the last for their edges. */
  function flame(x: number, y: number, size: number, keys: string, opts?: { wind?: number; period?: number; seed?: number; frame?: number }): PxOp;
  function scroll(name: string, y: number, per: number, opts?: { x?: number; frame?: number }): PxOp;
  function clouds(opts: PxClouds): PxOp;
  function plume(x: number, y: number, keys: string, opts?: PxPlume): PxOp;
  /** A function of (x, y) made to close over w (and h): for noise on strips and tiles that wrap. */
  function seamless(fn: (x: number, y: number) => number, w: number, h?: number): (x: number, y: number) => number;
  /** Shapes in meters drawn far to near through the camera (solid.stick, blob, box, cone, poly); boxes' faces lit by the sun. */
  function solids(view: PxView | PxPerspective, shapes: PxSolid[], opts?: PxSolidOpts): PxOp;
  /** The same shapes' shadows on the ground, from the sun: each ground color turned into its shade by `shade`. */
  function shadows(view: PxView | PxPerspective, shapes: PxSolid[], opts: PxSolidOpts & { sun: PxSun; shade: Record<string, string> }): PxOp;
  /** Flat faces in meters drawn through the camera with a depth per pixel (a dash round a driver, a wheel in front of its spokes): each toned along its material's ramp by how it lies to the light, outlined where a surface ends in front of another, creased where two faces of one material meet, its top edge a step lighter. Through perspective() points are [x, z, up]; a function camera takes [x right, y up, z ahead] from the eye. */
  function mesh(view: PxView | PxPerspective | PxProject, faces: PxFace[], mats: Record<string, PxMaterial>, opts?: PxMeshOpts): PxOp;
  /** A model for mesh(): face(mat, ...points), strip(mat, a, b) between two lines of points, loft(mat, sections), box(mat, corner, corner); faces holds them. */
  function model(): {
    faces: PxFace[];
    face(mat: string, ...pts: PxV3[]): number;
    strip(mat: string, a: PxV3[], b: PxV3[]): void;
    loft(mat: string, sections: PxV3[][]): void;
    box(mat: string, a: PxV3, b: PxV3): void;
  };
  /** Shapes in meters for solids() and shadows(). Points are [x, z, up]. */
  const solid: {
    /** round, from a to b, `half` m thick either side: trunks, limbs, poles, bars */
    stick(a: PxV3, b: PxV3, half: number, key: PxColor, extra?: Partial<PxSolid>): PxSolid;
    /** around e, rx m either side and ry m above and below: crowns, heads, wheels */
    blob(e: PxV3, rx: number, ry: number, key: PxColor, extra?: Partial<PxSolid>): PxSolid;
    /** [x0, z0, x1, z1, u0, u1], its faces' colors { top, lit, shade, under? } */
    box(b: [number, number, number, number, number, number], keys: { top?: PxColor; lit?: PxColor; shade: PxColor; under?: PxColor }, extra?: Partial<PxSolid>): PxSolid;
    /** round, tapering from a (radius ra) to b (rb), standing roughly upright: a torso, a skirt, a bin */
    cone(a: PxV3, ra: number, b: PxV3, rb: number, key: PxColor, extra?: Partial<PxSolid>): PxSolid;
    /** flat, through its points */
    poly(points: PxV3[], key: PxColor, extra?: Partial<PxSolid>): PxSolid;
  };
  /** Land with relief in perspective, ray-marched: height(x, z) in meters; fn gives the color of the point each pixel sees (u its height, t its distance). */
  function terrain(view: PxView | PxPerspective, height: (x: number, z: number) => number, fn: (x: number, z: number, u: number, t: number, col: number, row: number) => PxColor | null | undefined, opts?: PxTerrainOpts): PxOp;
  /** The items drawn on a plate of their own, lit there with relight (only the plate's edges), and laid down. */
  function plate(opts: PxRelight, ...items: PxItem[]): PxOp;
  function plate(...items: PxItem[]): PxOp;
  /** A figure built skeleton first: stand-ins in slots until each part is drawn (characters.md §11). */
  function rig(name: string, opts: PxRigOpts, ...retouch: PxItem[]): void;
  /** A standing figure's landmark rows from its height in px and heads tall (default 7.5). */
  function figure(h: number, heads?: number): PxFigure;
  /** Two bones from (0, 0) reaching for the point: [joint, end]; bend 1 (default) or -1 picks the side the joint bends to. */
  function ik(a: number, b: number, target: [number, number], bend?: number): [[number, number], [number, number]];
  /** Is there an asset or group of that name yet (a generated part made once). */
  function has(name: string): boolean;

  function px(x: number, y: number, c: PxColor): PxOp;
  function rect(x: number, y: number, w: number, h: number, c: PxColor): PxOp;
  function box(x: number, y: number, w: number, h: number, c: PxColor): PxOp;
  function line(x0: number, y0: number, x1: number, y1: number, c: PxColor, width?: number): PxOp;
  function hline(x: number, y: number, len: number, c: PxColor): PxOp;
  function vline(x: number, y: number, len: number, c: PxColor): PxOp;
  function circ(cx: number, cy: number, r: number, c: PxColor): PxOp;
  function ring(cx: number, cy: number, r: number, c: PxColor): PxOp;
  /** Part of a ring from angle `from` to `to` (degrees, clockwise from pointing right); inner: down to that radius; taper: a smear. */
  function arc(cx: number, cy: number, r: number, from: number, to: number, c: PxColor, opts?: { inner?: number; taper?: boolean }): PxOp;
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
  /** Gradient map onto a ramp: colors sorted dark to light take its keys in order, so imported tones never merge (hue: [from, to] picks colors). */
  function rampmap(ramp: string | string[], opts?: { where?: PxRegion; hue?: [number, number] }): PxOp;
  /** Move pixels by whole-pixel offsets (breathing, hair and tails swaying, a body on a slope): fn(x, y) gives [dx, dy] at a pixel's new place. */
  function warp(fn: (x: number, y: number) => [number, number] | null | undefined | false | 0, where?: PxRegion): PxOp;
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
