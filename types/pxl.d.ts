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

  /** A lane(): (x, y) => [s along it, u to its right]; total its length; point(s, u) where that is. */
  type PxLane = ((x: number, y: number) => [number, number]) & { total: number; point(s: number, u?: number): [number, number] };
  interface PxPlace {
    /** Of a group or glob, the member whose drawing is nearest this height in px (sizes of one thing). */
    fit?: number;
    /** Effects on this copy alone, on the canvas's clock: ["dissolve", { progress }] or a list of them. */
    fx?: PxEffect | PxEffect[];
    flip?: "x" | "y" | "xy"; rot?: 90 | 180 | 270; swap?: Record<string, PxColor>;
    rflip?: "x" | "y" | "xy"; rswap?: Record<string, PxColor>[]; seed?: number; reseed?: boolean | number;
    /** This copy n steps darker along the ramps (negative: lighter): a far limb; swap wins for the keys it names. */
    shade?: number;
    /** With shade: keys a step never lands on ("k": ramps that all start at the ink stop a key above it, no black). */
    floor?: string;
    /** stamp only: turned clockwise by any angle round the point it is placed by (its pivot: a part's joint; else its top-left), as a sprite's angle turns (RotSprite), its line turned with it. */
    angle?: number;
    /** Animated assets: freeze on frame n / start later (ms) / random start. */
    frame?: number; /** an anim as it is t ms into its own loop, frozen */ t?: number; delay?: number; rdelay?: boolean;
    /** stamp only: of a family named by the compass (name_n, name_ne, ...: views(), rig3d's moves, a turnaround), the one nearest this heading: compass degrees (0 away from us, 90 right) or a way on the ground [dx, dz]. */
    heading?: number | [number, number];
    /** stamp only, placed by a relation to an earlier stamp (it follows it; x, y an offset): its box gap px off that side of the other's. */
    beside?: [string, "left" | "right" | "above" | "below", number?];
    /** stamp only: its lowest pixel on another stamp's highest under it (its id), or on "ground", a row, a profile() at x. */
    on?: string | number | ((x: number) => number);
    /** stamp only: its pivot s px along a path (points [x0, y0, ...] or a lane()) and u px to its right. */
    along?: [number[] | PxLane, number, number?];
    /** stamp only: at x, y but out of another stamp's box (and gap px more), the shorter way. */
    apart?: string | [string, number?];
    /** stamp only: x, y between pixels (subpixel); [dx, dy] the way it moves (1 right/down, -1 left/up). */
    sub?: boolean | [number, number] | { from: [number, number] };
    /** stamp only: motion blur, the silhouette swept from where it was ([x, y]) to here, under it, in one key (default its lightest). */
    smear?: [number, number] | { from: [number, number]; c?: PxColor };
    /** Paint every opaque pixel this color: hit flashes, cast shadows, silhouettes. */
    silhouette?: PxColor;
    /** Lay the asset flat on the ground as its cast shadow: a pixel h above the base lands h * [kx, ky] away; a stamp's away from a light: { from: [x, y] (on the horizon) or [x, y, h], len? }. */
    cast?: [number, number] | { from: number[]; len?: number };
    /** In a layer a shade layer casts (its `of`): false, none; or its own cast ("sun": look3d()'s light). */
    shadow?: false | [number, number] | { from: number[]; len?: number } | "sun";
    /** Where cast measures height from: the pivot's row (default), or each column's lowest pixel (a hem or a base that isn't level). */
    castBase?: "pivot" | "column";
    /** Attach to a socket of an earlier stamp in this asset, "id.socket"; x, y become an offset from it. */
    at?: string;
    /** Which one this stamp is: `at`, relations, expect rules and describe name it by this (default: the asset name); its random picks (a group's member, reseed, rswap, rflip, rdelay) come from it, not from where it stands, so moving it keeps its look. */
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
  /** cells(): from `at`, `gap` px apart, labels in `key` (3 px in); `head` titles 2 px in on row `y` (default 8 over), `side` ones at `x` (2) by each row's middle. */
  interface PxCells { at?: [number, number]; gap?: number; key?: string; head?: { names: string[]; y?: number; key?: string }; side?: { names: string[]; x?: number; key?: string } }
  /** bubble(): the box a 9-slice `panel`, its `tail` down to the point (its top rows over the panel's bottom border), a `rule` under the title, the prompt `more` (an anim at frame `t`); `side` 1 right of the point, -1 left; its pixel `unit` of the art's (0.75); `pad` px in to the words (7). */
  interface PxBubble { panel: string; tail?: string; rule?: string; more?: string; font?: string; color?: PxColor | [PxColor, PxColor]; side?: number; t?: number; unit?: number; pad?: number }
  interface PxAssetOpts {
    w?: number; h?: number; base?: string; mx?: boolean | "c"; my?: boolean | "c"; swap?: Record<string, PxColor>;
    flip?: "x" | "y" | "xy"; rot?: 90 | 180 | 270; angle?: number; rotate?: "auto" | "rotsprite" | "shear" | "nearest"; outline?: PxColor; outline8?: PxColor; crop?: boolean; layers?: boolean;
    /**
     * inline: a 1px line over the sprite's own edge; { color, keep: "keys" } leaves edge pixels in
     * those keys alone (closes only the gaps of an outline already there). selout: the line takes
     * the color it touches, n steps darker (true = 2).
     */
    inline?: PxColor | { color: PxColor; keep?: string }; selout?: boolean | number; /** each straight run of the edge's line a step darker at its ends where it steps (true: 1) */ caps?: boolean | number; aa?: boolean;
    /** With selout or caps: keys a step never lands on ("k": ramps that all start at the ink stop a key above it, no black round everything). */
    floor?: string;
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
    /** With png: this "#rrggbb" read as clear, before area, shrink and palettize (a ripped sheet's cell fill). */
    key?: string;
    /** With png: its normal map, a PNG laid out as it (green up: pxl's _n.png, Sprite Fusion's), read as data; an anim's frames from the same rectangles. */
    normals?: string;
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
    /** the genre() it is made for: pxl check runs that genre's checks on it */
    genre?: string;
  }
  interface PxWorld {
    /** Ground in perspective: the horizon's row and the eye's height in meters; or a flat side view's px per meter. */
    horizon?: number; eye?: number; scale?: number;
    /** Where the light comes from, "sun" (look3d()'s, on things standing up), or a point light in the scene ({ at: [x, y] }: a fire, a lamp): each object's lit side is checked against it. Without it, the lamp lighting() lit each by, or a mesh's light; false: none. */
    light?: [number, number] | "sun" | { at: [number, number] } | false;
    /** A flat world (`scale`) seen from above, a map whose up is away from us (a top-down RPG's): describe says so, a shade layer's cast "sun" lays shadows on it. Default "side". */
    view?: "top" | "side";
    /** Flat side view: the ground's row, a profile [x0, y0, x1, y1, ...], or several (a floor, then ledges over it, each over its own span); what has a height is checked for floating or sinking against the nearest; stamp(name, x, "ground") stands on the first. */
    ground?: number | number[] | number[][];
  }
  /** A scene takes the transforms, outlines, crop, layers, pivot and wrap; what starts from or labels a drawing is for sprites and anims. */
  interface PxSceneOpts extends Omit<PxAssetOpts, "base" | "png" | "normals" | "area" | "key" | "palettize" | "shrink" | "slice" | "sockets" | "facing" | "height" | "twin" | "register" | "genre"> { w: number; h: number; bg?: PxColor; world?: PxWorld; /** a clock of its own: its functions read it (c.t, c.frame), what it stamps joins it */ frames?: number; fps?: number; /** false: check skips it (an HD render of a scene checked at its own size); { every: n } checks one frame in n (a long story) */ check?: boolean | { every: number }; /** rules on its placements, run by pxl check and fixed by --fix */ expect?: PxRule2d[];
    /** px to an art pixel (w and h the picture's): mesh(), the 3D ops, meshSocket() and post() draw that many times as big */
    pixel?: number;
    /** the same scene k times as big under other names, not checked ({ name_hd: 4 }); post() runs only there */
    sizes?: Record<string, number> }
  interface PxAnimOpts extends PxAssetOpts { fps?: number; frames?: number; /** a frame's ms instead of fps, or each frame's (as many frames) */ ms?: number | number[]; loop?: boolean; dir?: "forward" | "reverse" | "pingpong"; /** checked as a scene (c.as() names what its functions paint) */ world?: PxWorld; check?: boolean | { every: number } }
  interface PxFrame { ms?: number; hold?: number }
  interface PxGenre {
    camera?: { kind?: string; pitch?: number | Record<string, number> };
    /** a tile's px; null: none */
    grid?: number | null;
    /** a box per category, [tall, wide] in tiles (px with no grid) */
    scale?: Record<string, [number, number]>;
    heads?: number; dirs?: string[] | number; states?: Record<string, { frames?: number; ms?: number | number[] }>;
    contract?: { boxes?: string[]; [k: string]: unknown };
    /** the figure's own pitch, apart from the camera's */
    pitch?: number;
    /** ground: the feet on one row through a move; height: a family as tall in every direction; footprint: the drawing down to where it meets the ground */
    checks?: ("ground" | "height" | "footprint")[];
    /** any other field, kept for the file to read (tones, steer) */
    [field: string]: any;
  }
  interface PxLayerOpts {
    /** Draw the layer's stamps sorted: "y" by where they stand (top-down props), "z" by their z. */
    sort?: "y" | "z";
    x?: number; y?: number; hidden?: boolean; density?: number; solid?: boolean; wall?: boolean; unlit?: boolean;
    shade?: boolean | number | Record<string, PxColor>; light?: boolean | number | Record<string, PxColor>;
    /** A shade layer drawing the shadows of these layers' stamps and tiles (their functions' too: a route's walker), laid down by `cast` ("sun": look3d()'s light on a world: { view: "top" }) or each one's `shadow`, but those named in `except`. */
    of?: string | string[]; cast?: [number, number] | { from: number[]; len?: number } | "sun"; except?: string[];
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
    /** Steps darker on the far side for this part (default the rig's far; 0: as drawn). */
    far?: number;
    /** The part's asset (default "<rig>_<slot>"); on: its joint is a socket of another slot's part ("arm_l.hand"). */
    part?: string; on?: string;
    /** A part with two faces, each its own drawing; the one turned to us shows. */
    faces?: { outer?: string; inner?: string; edge?: string }; facesTo?: "left" | "right" | "front" | "back";
    /** Two of its sockets and two of another slot's whose lines must run parallel. */
    parallel?: [string, string, string, string];
  }
  interface PxRigOpts extends Omit<PxAssetOpts, "base" | "png" | "normals" | "area" | "palettize" | "shrink" | "flip" | "rot" | "angle" | "mx" | "my"> {
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
    /** through a perspective() camera: where it stands, [x, z, up] m; rise, wind and size then meters there */
    view?: PxView | PxPerspective; at?: [number, number, number];
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
  /** How a material is drawn by mesh(): its tones dark to light, the outline, the lit top edge, no creases on a round surface, a lift to its light, a dither between tones, a texture stepping the tone per pixel; or `tex`, an asset tiling its faces, `texel` m to its pixel (default 1/16), from the world's origin or each face's (`anchor`); `block` px to one of its pixels (its faces in blocks, pixel art among HD faces). */
  interface PxMaterial { ramp?: string | PxColor[]; edge?: PxColor; top?: PxColor; smooth?: boolean; bias?: number; dither?: number; texture?: (x: number, y: number) => number; tex?: string; texel?: number | [number, number] | "screen"; anchor?: "world" | "face"; block?: number;
    /** holes eating its faces (and its shadow): progress 0..1, blobs scale m wide, a burning edge key */
    dissolve?: { progress: number; scale?: number; seed?: number; edge?: PxDissolve["edge"]; width?: number; pattern?: PxDissolve["pattern"]; ragged?: number; at?: PxV3; mask?: string; look?: PxDissolve["look"]; char?: PxDissolve["char"]; glow?: number } }
  /** A sprite standing among mesh()'s faces: its feet at [x, z] or [x, z, up] m, the contact shadow's radius in m (0: none). */
  interface PxMeshSprite { name: string; /** or a function of the time (ms on the clock), none where it gives none */ at: [number, number] | PxV3 | ((t: number) => [number, number] | PxV3 | null | undefined);
    /** which one it is, as a stamp's: its sockets (a spell's from: "hero.hand", a stamp's at), describe's name for it, its random picks */ id?: string;
    /** n copies of it ms apart back in time (`at` a function of the time), each fade fainter, blended, no light, no shadow */ ghosts?: [number, number, number]; /** of a family named by the compass, the one nearest this heading, as a stamp's */ heading?: number | [number, number]; flip?: "x"; frame?: number; delay?: number; rdelay?: boolean; seed?: number; reseed?: boolean | number; shadow?: number;
    /** effects on this sprite alone, as a stamp's */
    fx?: PxEffect | PxEffect[];
    /** laid over what is behind by its alpha (smoke: "alpha"; light: "add", "screen"), no shadow; `veil` (an "alpha" one): the share of the sun its pixels hold back, a faint shadow */
    blend?: "alpha" | "add" | "screen"; opacity?: number; veil?: number;
    /** the light its effect("emit") pixels give round them: r m, strength, a lamp for `each` part glowing apart; false for none */
    light?: false | { r?: number; strength?: number; each?: boolean };
    /** its feet on the model: on the highest face looking up under it (true), or on those materials'; `air`: it flies or hangs (check doesn't ask its feet to be on the model) */
    stand?: boolean | string[]; air?: boolean }
  /** mesh()'s light: the way toward it in the points' frame, or a face's light (0 dark, 1 lit) from its normal toward the eye, its middle, the face; sprites standing among the faces (a perspective view). */
  interface PxMeshOpts {
    light?: PxV3 | ((normal: PxV3, middle: PxV3, face: PxFace) => number); sprites?: PxMeshSprite[]; /** px to a sprite's pixel (an HD picture: 4) */ pixel?: number;
    /** Light in the world (textured faces and sprites, through their normal maps): the sun's color (`light` the way to it), the sky's, lamps, keys that give light, the sun's shadows (default on). */
    sun?: PxColor | { color: PxColor; strength?: number }; sky?: PxColor | { color: PxColor; strength?: number };
    lamps?: { at: PxV3; color: PxColor; r?: number; strength?: number }[]; emit?: string;
    /** the sun's shadows (default true with one); without a sun, true: cast from `light`, a ramp face a step down where they fall */
    shadows?: boolean;
    /** an orthographic view ("side", "top", "iso", { kind, ... }): px to the meter (16), where the points' [0, 0, 0] lands, [x, y] px */
    ppm?: number; at?: number[];
    /** the sprites whose `at` has no up stand on the model: on the highest face looking up under them (true), or on those materials' */
    stand?: boolean | string[];
  }
  /** A camera of one's own for mesh(): a point in the camera's frame (x right, y up, z ahead, from the eye) to [col, row, depth]. */
  type PxProject = (p: PxV3) => [number, number, number];
  /** What a field's parameters read: ms, 0..1 over the loop, the frame, the loop's frames. */
  interface PxClock { t: number; phase: number; frame: number; frames: number }
  /** A number of a field, or one read from the clock when it is drawn. */
  type PxNum = number | ((c: PxClock) => number);
  type PxVec = PxNum[] | ((c: PxClock) => number[]);
  /** A distance field in meters ([x, y ahead, z up]): how far a point is from its surface, negative inside. Each method gives a new one. */
  interface PxSdf {
    readonly kind: "distance";
    union(...a: (PxSdf | { smooth?: PxNum })[]): PxSdf; subtract(...a: (PxSdf | { smooth?: PxNum })[]): PxSdf; intersect(...a: (PxSdf | { smooth?: PxNum })[]): PxSdf;
    at(x: PxNum | PxVec, y?: PxNum, z?: PxNum): PxSdf; rotate(deg: PxNum, axis?: "x" | "y" | "z" | PxVec): PxSdf; scale(s: PxNum | PxVec): PxSdf;
    /** degrees a meter up */ twist(deg: PxNum): PxSdf;
    /** a point z m up moved k z^2 / 2 m along x (or [kx, ky]) */ bend(k: PxNum | PxVec): PxSdf;
    mirror(axes?: string): PxSdf; repeat(step: PxVec, count?: PxNum | PxVec): PxSdf;
    noise(o: { amp: PxNum; scale?: PxNum; seed?: number; octaves?: number }): PxSdf;
    mat(name: string): PxSdf; paint(name: string, where: (p: PxV3, n: PxV3) => unknown): PxSdf;
    /** the material it names at each point (nothing: what it was); a name not in mats that is a ramp of keys ("RPp") is that ramp */
    paint(by: (p: PxV3, n: PxV3) => string | null | undefined): PxSdf;
    /** a name for this part of it: what painted a pixel is said by it (pxl steps --at) */
    part(name: string): PxSdf;
    bounds(clock?: PxClock): [PxV3, PxV3]; dist(p: number[], clock?: PxClock): number;
  }
  /** grid: on voxels' pixel grid (a voxel grid's iso and top are, unless false; a field's, or voxels from the side, when true) */
  type PxSurfaceView = "side" | "top" | "iso" | { kind?: "side" | "top" | "iso"; yaw?: number; pitch?: number; origin?: [number, number]; grid?: boolean } | PxView;
  /** surface()'s options: the view (orthographic at ppm px to the meter, its origin at `at` px; or a perspective() view, standing `at` [x, z, up] m), the materials' ramps, the light, the outline, the rim, its own shadows, the creases, a ray to K x K px, its shadow on what is drawn. */
  interface PxSurfaceOpts {
    /** a material: its ramp, a glint (shine), strokes m apart lighter where the sun is (needles), hem px hanging in points under it */
    view?: PxSurfaceView; ppm?: number; at?: number[]; mats?: Record<string, string | PxColor[] | { ramp: string | PxColor[]; shine?: number; strokes?: number; hem?: number }>;
    /** the way toward the light; "view": its view's own (from the upper left) where look3d() gives another; "mesh": the light of the mesh() drawn before it with a sun (its way, sun, sky and lamps) */
    light?: number[] | "view" | "mesh"; /** the light wrapped round the form, 0..1: a side square to it lit soft / (1 + soft) */ soft?: number; outline?: boolean | PxColor; /** a line where one part lies in front of another, on the one behind: a key, or true (the outline's) */ inner?: boolean | PxColor; /** a step lighter toward the light; a number: where open both ways it comes from, at least that share up the ramp (a sun behind) */ rim?: boolean | number; shadows?: boolean; ao?: number; pixel?: number; cast?: number;
    /** through a camera: its shadow alone (a mesh made of it in its place) */
    hide?: boolean;
    /** the name of the part it is (pxl steps --at) */
    part?: string;
    /** a pixel artist's pass before its lines: no black run 2 px thick, the outline whole, a pixel sticking out cut away */
    clean?: boolean;
  }
  /** A density's options: its soft edge (m), the noise eating it (m, billows scale m across, octaves), carried flow m over the loop, thinned away up from fade [z0, z1]. */
  interface PxDensityOpts { edge?: number; noise?: PxNum; scale?: PxNum; seed?: number; octaves?: number; flow?: PxVec; fade?: [number, number] }
  /** How much matter there is at a point, 0..1, at a moment; its box. */
  interface PxDensity { readonly kind: "density"; at(p: number[], clock?: PxClock): number; bounds(clock?: PxClock): [PxV3, PxV3] }
  /** volume()'s options: the view, its ramp, the light, how much a meter holds back, its shade, the grid's cell, what glows (and lights round it, m), dither or alpha where thin, a ray to K x K px, its shadow on what is drawn. */
  interface PxVolumeOpts {
    view?: PxSurfaceView; ppm?: number; at?: number[]; ramp?: string | PxColor[]; light?: number[] | "view" | "mesh"; thickness?: number; ambient?: number; shadow?: number; cell?: number;
    emit?: { ramp: string | PxColor[]; strength?: number; glow?: number }; blend?: "dither" | "alpha"; pixel?: number; cast?: number; part?: string;
  }
  /** Gaussian splats: how many, their box. */
  interface PxSplats { readonly kind: "splats"; readonly n: number; bounds(): [PxV3, PxV3] }
  /** splats()'s options: made here from a field or density (spacing, size, seed), the view, materials' ramps or one ramp, the light, dither/cut/alpha where thin, the outline, a cell of K x K px. */
  interface PxSplatOpts {
    spacing?: number; size?: number; seed?: number; view?: PxSurfaceView; ppm?: number; at?: number[];
    mats?: Record<string, string | PxColor[] | { ramp: string | PxColor[] }>; ramp?: string | PxColor[]; light?: number[] | "view"; blend?: "dither" | "cut" | "alpha"; outline?: boolean; pixel?: number; part?: string;
  }
  /** sdf.scatter's options: on a material or where, how many a square meter, facing up, lit only, turned, sizes, the brush, tone steps, its material, seed, light, flutter. */
  interface PxScatterOpts {
    on?: string | string[]; where?: (p: PxV3, n: PxV3) => unknown; count?: number; up?: number; lit?: boolean; orient?: "normal" | "up" | number[];
    size?: number | [number, number]; brush?: "ellipse" | "dot" | "clump" | "leaf" | "blade" | "cluster"; vary?: number; mat?: string; seed?: number; light?: number[]; flutter?: number;
  }
  /** decal()'s options: the field it lies on, where (its rest frame), its up, pin or wrap, its size, other views, lit or glowing, the view as surface()'s, its part. */
  interface PxDecalOpts {
    on: PxSdf; point: number[]; up?: number[]; mode?: "pin" | "wrap"; size?: number; views?: { three?: string; profile?: string }; lit?: boolean;
    /** pin: m in front of or behind its point what is drawn under a texel may lie and still take it (default its own width) */
    depth?: number;
    view?: PxSurfaceView; ppm?: number; at?: number[]; pixel?: number; light?: number[] | "view"; part?: string;
    /** none of it where the surface turns edge on to the eye; lit, never darkened into a ramp's darkest */
    clean?: boolean;
  }
  /** What a builder makes: a field (or a density and its look), named parts, details, decals, sockets. */
  interface PxBuilt { field?: PxSdf; density?: PxDensity; parts: Record<string, PxSdf>; details: Record<string, PxScatterOpts>; decals: Record<string, { asset: string; point: PxV3 }>; sockets: Record<string, PxV3> }
  /** A scene as data: named parts by builders and relations; an edit of it, what changed, where a part stands. */
  interface PxWorld { readonly kind: "world"; readonly names: string[]; edit(changes: Record<string, unknown>): PxWorld; changed(other: PxWorld): string[]; place(name: string, clock?: PxClock): PxV3; built(name: string): PxBuilt }
  interface PxPartSpec { make: "tree" | "pine" | "bush" | "rock" | "house" | "crystal" | "mist" | "smoke" | (string & {}); params?: Record<string, unknown>; seed?: number; at?: number[] | ((c: PxClock) => number[]); on?: string; beside?: [string, string, number?]; around?: string; attach?: [string, string];
    /** s m along a path of [x, y] or [x, y, z] (a row: a part a post); kept clear of another's box seen from above, gap m */
    along?: [number[][], number]; apart?: [string, number?];
    /** its own materials over draw3d's; air: its own look ({ ramp: keys, thickness, ... }) */
    mats?: Record<string, unknown>; look?: { ramp?: string; thickness?: number; ambient?: number; cast?: number; emit?: { ramp: string; strength?: number; glow?: number } };
    /** a solid drawn as its surface, voxels, splats or a mesh, over draw3d's (world.edit({ "oak.as": "voxels" })) */
    as?: PxAs }
  /** How draw3d() draws a solid: rays to its surface (surface()), voxels(), splats() or a mesh() of its surface; the splats' and the mesh's shadow its field's. */
  type PxAs = "surface" | "voxels" | "splats" | "mesh";
  /** draw3d()'s options: the view, where the world stands, its materials and light, a ray a block, these parts only; how its solids are drawn (`as`), the cell of voxels and of a mesh (`size`, m, 0.1), the splats' spacing; more of surface()'s options (`surface`: soft, outline, rim, ao, shadows). */
  interface PxDraw3dOpts { view?: PxSurfaceView; ppm?: number; at?: number[]; mats?: Record<string, unknown>; light?: number[] | "view" | "mesh"; pixel?: number; only?: string[]; as?: PxAs; size?: number; spacing?: number; surface?: Record<string, unknown> }
  /** A figure's pose, the file's own numbers: each foot [forward, right] on the floor from under the pelvis (left, right), lifted; the pelvis down; leaning forward and to the right (deg); the hips turned from the heading, the shoulders against them, the head against those (deg, clockwise from above); each hand [forward, right, up] from its shoulder, or both on one line (grip: its ends [forward, right, up] from under the pelvis as the shoulders face, each hand `at` its share of the way, [left, right]). Other keys pass to parts(). */
  interface PxPose { feet?: number[][]; lift?: number[]; down?: number; lean?: number; tilt?: number; turn?: number; twist?: number; head?: number; hands?: number[][]; grip?: { from: PxV3; to: PxV3; at: [number, number] }; [k: string]: unknown }
  /** A piece of a figure's part: a field, and its paint: a material (a ramp of keys or a name in mats) or (h along it 0..1, a round it from the way the body faces, outside) => one. */
  interface PxPiece { field: PxSdf; paint?: string | ((h: number, a: number, outside: boolean) => string | null | undefined) }
  /** The joints a pose puts where at a heading, in the sprite's px (x across, y away from us, z up); limb() and ball() make pieces along them; screen() where a point lands on the sprite, depth() how near us it is. */
  interface PxJoints {
    heading: number; f: PxV3; r: PxV3; up: PxV3; spine: PxV3; pelvis: PxV3; chest: PxV3; head: PxV3;
    sh: { f: PxV3; r: PxV3 }; hd: { f: PxV3; r: PxV3; heading: number };
    legs: { hip: PxV3; knee: PxV3; ankle: PxV3; foot: PxV3 }[]; arms: { sh: PxV3; elbow: PxV3; hand: PxV3 }[];
    /** the pose's grip, [from, to]: the line the hands hold */
    grip?: [PxV3, PxV3];
    /** in a draw hook: a line of pixels from a to b in the figure's own depth (a held broom), paint a key or (t) => key along it */
    rod(a: PxV3, b: PxV3, paint: string | ((t: number) => string | undefined)): void;
    limb(a: PxV3, b: PxV3, r0: number, r1?: number, paint?: PxPiece["paint"]): PxPiece;
    ball(c: PxV3, r: number | PxV3, paint?: PxPiece["paint"]): PxPiece;
    /** a surface swept round an upright through base from z0 up to z1: keep(h, a) the part there is, shift(h) [dx, dy] that height carried off the axis, shell half its thickness (a cloth) */
    sweep(base: PxV3, z0: number, z1: number, radius: (h: number, a: number) => number, o?: { keep?: (h: number, a: number) => unknown; shift?: (h: number) => number[]; shell?: number; paint?: PxPiece["paint"] }): PxPiece;
    /** hand-drawn pixel art pinned on the figure at point, its other views by the angle (as decal()) */
    decal(asset: string, point: PxV3, o?: { views?: { three?: string; profile?: string }; up?: PxV3; on?: PxSdf; depth?: number; lit?: boolean }): { decal: object };
    /** sdf.scatter's brushes on a field (strands, tufts), drawn on the figure before the line round it */
    scatter(field: PxSdf, o?: PxScatterOpts): { scatter: object };
    screen(p: number[]): [number, number]; depth(p: number[]): number;
  }
  /** rig3d()'s body: figure(h, heads)'s lengths in px unless given; half the hips, the shoulders [forward, half the width, down]; the blocks' thickness. */
  interface PxBody { h?: number; heads?: number; hip?: number; torso?: number; neck?: number; thigh?: number; shin?: number; upper?: number; fore?: number; ankle?: number; hips?: number; shoulders?: PxV3;
    r?: { leg?: PxV3; arm?: PxV3; body?: [number, number]; head?: number; hand?: number; foot?: PxV3 } }
  /** What rig3d() made: its anims' names, its headings, the joints of a pose at a heading and where a point lands (to draw by hand), its one size and pivot. */
  interface PxRig3d { names: string[]; headings: string[]; joints(pose: PxPose, heading: number): PxJoints; screen(p: number[]): [number, number]; depth(p: number[]): number; w: number; h: number; pivot: [number, number] }
  /** What turnaround() made: its sprites' names and their headings, in order, their one size and pivot, those that are another's mirror. */
  interface PxTurnaround { names: string[]; headings: string[]; w: number; h: number; pivot: [number, number]; mirrored: string[] }
  /** A scene's rules (its expect): a and b a stamp's id or an asset placed once, b also a box [x, y, w, h]; gap the empty px between their pixels; while takes two rules; frames: the span of the loop it holds over. */
  type PxRule2d = { beside?: [string, string | number[], { gap?: number | [number, number]; side?: "left" | "right" | "above" | "below" }]; before?: [string, string]; apart?: [string, string | number[], number?]; inside?: [string, PxRegion]; onGround?: [string, (number | ((x: number) => number))?]; while?: [PxRule2d, PxRule2d]; frames?: [number, number] };
  /** expect3d's rules; before and while take two rules of a place. */
  type PxRule = { above?: [string, string]; on?: [string, string]; apart?: [string, string]; near?: [string, string, number]; reaches?: [string, number[], number, number?]; within?: [string, number[][]]; before?: [PxRule, PxRule]; while?: [PxRule, PxRule] };
  /** voxels()'s options: surface()'s (ao 0 unless given: a face darker at the creases); a cell's size (given a field), a cube's width in px (iso and top on the pixel grid). */
  interface PxVoxelOpts extends PxSurfaceOpts { size?: number | number[]; px?: number }
  /** A voxel grid: cells a side, their size in m, its low corner, how many are filled, its box; its outside as a mesh, and as mesh()'s faces. */
  interface PxVoxels { readonly kind: "voxels"; readonly n: PxV3; readonly size: PxV3; readonly origin: PxV3; readonly count: number; bounds(): [PxV3, PxV3]; mesh(): PxMesh3; readonly faces: PxFace[] }
  /** A mesh in meters: positions, normals, quads (4 indices each) and their materials; mesh()'s faces. */
  interface PxMesh3 { readonly kind: "mesh"; readonly positions: Float32Array; readonly normals: Float32Array; readonly quads: Uint32Array; readonly mats: string[]; readonly faces: PxFace[] }
  /** terrain()'s options: how far to look (m), the land's highest point, a cheap height it never rises more than `margin` above, the sky's color where a pixel sees no land. */
  interface PxTerrainOpts {
    far?: number; top?: number; bound?: (x: number, z: number) => number; margin?: number;
    sky?: (col: number, row: number) => PxColor | null | undefined;
  }
  /** A pinhole camera over flat ground, in meters: the horizon's row, the eye's height, a field of view. */
  interface PxView {
    w?: number; horizon?: number; eye?: number; fov?: number; focal?: number;
    /** Looking down at the picture's middle instead of horizon: the picture's height, and px to the meter where it looks instead of eye (HD-2D's camera). */
    h?: number; ppm?: number;
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
    readonly w: number; readonly horizon: number; readonly eye: number; readonly focal: number; readonly vp: number; readonly yaw: number; readonly pitch: number; readonly bend: number; readonly fov?: number;
    /** The picture's height, when given one ({ w, h, pitch, ppm }). */
    readonly h?: number;
    /** Looking down: the ground z m ahead where it looks, dist m from the eye along its axis (post() focuses there), the texels a texel to a pixel there on a floor and on a wall. */
    readonly z?: number; readonly dist?: number; readonly floor?: [number, number]; readonly wall?: [number, number];
    /** Looking down: where to stand a thing, [x, z, up], so its point mid m up is where the camera looks (lifted up m). */
    aim(mid: number, up?: number): [number, number, number];
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
  interface PxBump {
    w?: number; depth?: number; on?: string; where?: PxRegion;
    /** "hybrid" only, Sprite Fusion's settings: defaults 4, 1.15, 1.15, 6, 0.6. */
    shapeRadius?: number; shapeStrength?: number; shapeSoftness?: number; detailStrength?: number; detailScale?: number;
  }
  type PxBumpShape = "dome" | "bevel" | "luma" | "hybrid";
  interface PxLighting {
    cell?: number; ambient?: number; ambientColor?: PxColor; sky?: number; skyColor?: PxColor; skyReach?: number;
    block?: number; smooth?: boolean; emit?: string; shape?: "round" | "diamond";
    relief?: number; skyDir?: [number, number];
    /** the emitting pixels (emit keys, effect("emit"), a spell) light what is round them: reach px, or { r, power } */
    emitLight?: number | { r?: number; power?: number };
  }
  /** post(): a depth of field from mesh()'s depth (the pixel in focus, m kept sharp, m to full blur, the blur's radius in px), a bloom, a haze by depth, darker corners. */
  interface PxPost {
    focus?: [number, number]; sharp?: number; soft?: number; blur?: number;
    bloom?: number | { above?: number; r?: number; strength?: number; levels?: number; spread?: number };
    fog?: { color: PxColor; from: number; to: number; max?: number };
    vignette?: number;
    /** px to an art pixel: sharpen, grain and the palette's dither work in blocks of it */
    pixel?: number;
    /** each pixel stepped from its four neighbours (a block off) by this much of the difference: 0.2-0.3 a little */
    sharpen?: number;
    /** a grade from a .cube file next to the art file, at amount (0..1) */
    /** a .cube file or a LUT strip PNG (256x16) next to the art file */
    lut?: string | { cube: string; amount?: number };
    /** film grain in blocks of pixel, new each frame, in the middle tones: up to amount of full scale */
    grain?: number | { amount?: number; seed?: number; animated?: boolean };
    /** the picture taken back to the palette (true) or to those keys, Bayer-dithered between two by dither (0 the nearest) */
    palette?: true | string | string[] | { keys?: string | string[]; dither?: number };
    /** in a scene k times as big (pixel, sizes), blur, focus, bloom's r and pixel are the art's px: true keeps them the picture's */
    px?: boolean;
  }
  /** Options every effect takes: the pixels it writes (a region, keys) and its seed. */
  interface PxEffectBase { where?: PxRegion; on?: string; seed?: number }
  /** dissolve: noise holes over `progress` (0..1) of the drawing, `scale` px a blob, rings of `edge` keys round them (the first at the hole). */
  interface PxDissolve extends PxEffectBase {
    progress?: number; scale?: number; pixel?: number;
    /** what eats it: a burn, acid, magic, frost, or the neutral ring (the default with no look and no edge) */
    look?: "neutral" | "burn" | "acid" | "magic" | "frost";
    /** its keys, a ring each; a list of them over the progress; false for none */
    edge?: false | string | string[] | (string | string[])[];
    /** a band ahead of the edge where its own colors go toward tones */
    char?: number | { width: number; tones?: string | string[]; amount?: number; desat?: number };
    glow?: number; jag?: number;
    /** flames rising from the burning front (the burn look has them): height px, density, keys base to tips */
    flames?: boolean | { height?: number; density?: number; keys?: string | string[] };
    debris?: "ash" | "acid" | "frost" | "sparks" | { kind: "ash" | "acid" | "frost" | "sparks"; keys?: string | string[]; density?: number; life?: number };
    /** the order holes come in: noise blobs, a sweep from a side, out from a point or in to it, scattered, scanlines, a painted mask's dark first */
    pattern?: "noise" | "top" | "bottom" | "left" | "right" | "out" | "in" | "scatter" | "scan" | "mask";
    ragged?: number; at?: [number, number]; mask?: string;
  }
  /** energy: noise flowing inside the drawing in bands of keys dark to bright, its rim the brightest, marked as giving light. */
  interface PxEnergy extends PxEffectBase { keys: string | string[]; scale?: number; speed?: number; rim?: number; pixel?: number }
  /** A spell's phases on the clock: (t) the phase then; start(name) when a phase or event begins; along(from, to, t) a point over "travel". */
  interface PxAbility {
    (t: number): { name: string; i: number; k: number; ms: number; since: number; before: boolean; done: boolean };
    start(name: string): number;
    total: number;
    along(from: number[], to: number[], t: number, opts?: { phase?: string; arc?: number; ease?: "linear" | "in" | "out" }): number[];
    /** A pose's frame by phase: steps [phase, from, to?, ms?] in order; before the first, after the last ends. */
    frame(t: number, steps: [string, number, number?, number?][], opts?: { before?: number; after?: number }): number;
    /** 0..1 from moment a (a phase or event, or [it, ms after]) to b (default the end of a's phase). */
    span(t: number, a: string | [string, number], b?: string | [string, number]): number;
    /** The same span in and out: min(1, k / in) × min(1, (1 - k) / out), 0 outside it. */
    fade(t: number, a: string | [string, number], b?: string | [string, number], opts?: { in?: number; out?: number }): number;
    /** Whole ms steps since a moment, up to n - 1. */
    since(t: number, a: string | [string, number], ms?: number, n?: number): number;
  }
  /** A step of a route: a leg walked from a to b (as written), or a hold at a; its frames from `start`. */
  interface PxRouteLeg { name?: string; dir: string; a: number[]; b: number[]; n: number; start: number; walk: boolean }
  interface PxRoute {
    /** The figure at frame f, a sprite for mesh(): `${anim}_${dir}` at its feet (with `px`, the whole px to stamp it at); null before it starts and once it is done. */
    (f: number): { name: string; at: number[]; frame: number; dir: string; flip?: "x" } | null;
    /** The frame a named step begins; span, fade and since as an ability's. */
    start(name: string): number;
    span: PxAbility["span"]; fade: PxAbility["fade"]; since: PxAbility["since"];
    step(name: string): PxRouteLeg;
    /** A point [x, z] nearer than d m to one of its legs (a tree in its way). */
    near(p: number[], d: number): boolean;
    /** s m along its points (corners rounded by `round`), straight on past both ends: where and the unit way it heads. */
    at(s: number): { x: number; z: number; heading: number[] };
    /** Its frames, and those rounded up to a whole number of `loop`. */
    total: number; frames: number;
  }
  interface PxParticle { x: number; y: number; vx: number; vy: number; age: number; life: number; id: number }
  /** An element of the spell kit: a recipe (scenes.md, "Designing an element"); `like` an element to start from. */
  interface PxElement {
    /** the ball: its noise, or the file's own art: an asset (an anim, played from the charge's start), or a list grown through the charge */
    like?: string; keys?: string[]; ball?: false | string | string[] | { r?: number; scale?: number; speed?: number }; bolt?: boolean;
    /** its trail: ms long, px wide; or `ghosts` copies of the ball `every` ms back, each fainter (a list's entry smaller) */
    motion?: { arc?: number; ease?: "linear" | "in" | "out"; wave?: number }; trail?: false | { length?: number; width?: [number, number]; ghosts?: number; every?: number };
    particles?: false | (PxEmitter & { keys?: string[] });
    /** `anim`: the file's own, played once from the hit where it hits, in place of the shape (a list: the tier picks one) */
    impact?: { shape?: "burst" | "ring" | "shards" | "splash" | "debris" | "swirl" | "rays" | "implode" | "sparkle"; keys?: string[]; smoke?: false | string[]; anim?: string | string[] };
    /** the centerpiece, or the file's own `anim` played once from the hit on the ground under the target (a list: the tier picks one) */
    big?: "pillar" | "bolts" | "spikes" | "tornado" | "sphere" | "beam" | "helix" | "nova" | "blizzard" | "quake" | "slide" | "rain" | "grasp" | "leaves" | { anim: string | string[] };
    mark?: false | string[]; flash?: string; light?: string;
    /** how the file's own art pieces (ball, impact's and big's anim) lie on what is drawn: as they are, or as light ("add", "screen", by their alpha) */
    blend?: "add" | "screen";
    timing?: { charge?: number; cast?: number; travel?: number; impact?: number; dissipate?: number };
    /** its variants, the first its own way; what its solids are made of */
    variants?: string[];
    /** "ice", "rock", or the file's keys: tones dark to light (2-6, spread over 6), rim, glint, crack, moss (3), drawn as `like` */
    matter?: "ice" | "rock" | { like?: "ice" | "rock"; tones: string | string[]; rim?: string; glint?: string; crack?: string; moss?: string | string[] };
  }
  /** A variant's shape and complexity: size (times the tier's), how many, facets, jaggedness 0..1, pieces it breaks into, ms it stays. */
  interface PxForm { size?: number; count?: number; facets?: number; jag?: number; debris?: number; stay?: number }
  /** How a spell is seen: "side" (3/4), "top", "iso" 2:1, { kind, origin, height }, or a perspective() view (the world in meters). */
  type PxSpellView = "side" | "top" | "iso" | { kind?: "side" | "top" | "iso"; origin?: [number, number]; height?: number } | PxView;
  /** spell()'s options: where from and to, the ground's row, when; the tier's factors; anything of the element over it. */
  interface PxSpellOpts extends Omit<PxElement, "like" | "variants"> {
    /** [x, y, z] in the view's world; seen from the side with no view, [x, y] on the picture and `ground` the ground's row; `from` also the caster's hand: a socket ("hero.hand") or { at: [x, y] } on the picture */
    from: number[] | string | { at: [number, number] }; to: number[]; ground?: number; hand?: number; view?: PxSpellView; variant?: string; form?: PxForm; start?: number; seed?: number;
    scale?: number; count?: number; time?: number; reach?: number; power?: number; glow?: number; shake?: number;
  }
  /** A whole cast on the clock, drawn by cast(); its ability, where it is, its lamps, flash and shake at a time. */
  interface PxSpell {
    ability: PxAbility; total: number; element: PxElement; variant?: string; tier: number; glow: number;
    /** the view it is seen through: P(point) where a world point lands, s(point) px a world unit there */
    view: { kind: string; P(p: number[]): [number, number]; s(p: number[]): number; unit: number };
    /** where it is at a time, in the view's world */
    at(t: number): number[];
    lights(t: number): { x: number; y: number; r: number; power: number; color: string }[];
    /** the same lamps in its world (m through a perspective() camera): mesh()'s `lamps: S.lamps(c.t)` */
    lamps(t: number): { at: PxV3; r: number; strength: number; color: string }[];
    /** through a perspective() camera: how far from the eye its nearest part is now (cast() after a mesh() draws it at that depth) */
    depth(t: number): number | undefined;
    flash(t: number): { color: string; amount: number } | undefined;
    shake(t: number): [number, number];
    /** the target's dissolve now, for its fx: the element's look (or `look`) spreading from the impact over `over` ms, then `back` ms of coming back whole; undefined before and after */
    hit(t: number, opts?: PxDissolve & { over?: number; back?: number }): ["dissolve", PxDissolve] | undefined;
  }
  /** trail(): ms back from `t` (default the clock), px wide, keys' dither; a blade's: `taper` to nothing at its tail, `side(q)` the stretches kept (q the tip's middle, with what the path gives after x and y) */
  interface PxTrail { length?: number; width?: [number, number]; fade?: number; step?: number; from?: number; t?: number; taper?: boolean; side?: (q: number[]) => boolean }
  /** An emitter: the particles alive at t; `sprites(t, { name, at, blend })` the same as mesh() sprites, in m from `at` [x, z, up]. */
  interface PxEmitted {
    (t: number): PxParticle[];
    sprites(t: number, o: { name: string | string[]; at: number[]; blend?: "alpha" | "add" | "screen" }): PxMeshSprite[];
  }
  interface PxEmitter {
    at?: [number, number] | ((t: number) => [number, number]); rate?: number; burst?: number; from?: number; to?: number; life?: [number, number];
    speed?: [number, number]; angle?: number; spread?: number; gravity?: [number, number]; drag?: number; loop?: number; seed?: number;
  }
  /** aura: the silhouette grown width px in bands of the color keys (inner first), clearer outward by fade; pulse, a flickering edge; only the glow unless keep. */
  interface PxAura extends PxEffectBase { width?: number; color: string | string[]; fade?: number; pulse?: number; flicker?: number; scale?: number; speed?: number; keep?: boolean; pixel?: number }
  /** smoke(): a column, a puff, a bank or a ring of billows at this moment of the loop, lit on top, in three opacities. */
  interface PxSmoke {
    shape?: "column" | "puff" | "bank" | "ring"; count?: number; size?: [number, number]; vary?: number; rise?: number; path?: number[];
    wind?: number | [number, number]; spread?: number; length?: number; flat?: number; turbulence?: number; rough?: number; thin?: number;
    life?: number; alpha?: [number, number, number]; light?: [number, number]; pixel?: number; seed?: number; frame?: number;
    /** through a perspective() camera: where it stands, [x, z, up] m; the lengths given then meters there, each billow as far as it is */
    view?: PxView | PxPerspective; at?: [number, number, number];
  }
  /** pixelate: cells of `size` px, each the color most of its pixels have. */
  interface PxPixelate extends PxEffectBase { size?: number }
  /** dither: ordered (Bayer 4x4) to `keys` (default the palette); part-clear pixels go clear or opaque. */
  interface PxDitherFx extends PxEffectBase { keys?: string | string[]; pixel?: number }
  /** tint: opaque pixels blended toward `color` by `amount`, as a layer's blend mode; `ramp` keeps it in the palette (true) or in those keys. */
  interface PxTint extends PxEffectBase { color: PxColor; amount?: number; blend?: "normal" | "multiply" | "screen" | "add" | "overlay"; ramp?: boolean | string | string[] }
  /** distort: each pixel takes the one up to `amount` px away, offsets read off noise `scale` px a cell that goes `speed` cells round a circle over the loop. */
  interface PxDistort extends PxEffectBase { amount?: number; scale?: number; speed?: number; axis?: "xy" | "x" | "y"; pixel?: number }
  /** emit: `strength` of `color` (default their own) added in linear light, past white into white; `pulse` breathes it over the loop. */
  interface PxEmit extends PxEffectBase { color?: PxColor; strength?: number; pulse?: number }
  /** sway: rows moved sideways by their height over the base, `amount` px at the top (negative: to the left), `lean` of it always downwind, `cycles` a loop. */
  interface PxSway extends PxEffectBase { amount?: number; lean?: number; power?: number; still?: number; cycles?: number; flutter?: number; vary?: number; pixel?: number;
    /** something passing through at column `push` (px from the left): the stems within `reach` px bent away from it, `bend` px at the top */
    push?: number; reach?: number; bend?: number;
    /** what moves painted instead of by height: an asset of the same size, each pixel's lightness its share (white all, black and clear none) */
    mask?: string }
  type PxEffect =
    | ["dissolve", PxDissolve?] | ["pixelate", PxPixelate?] | ["dither", PxDitherFx?] | ["tint", PxTint]
    | ["distort", PxDistort?] | ["sway", PxSway?] | ["emit", PxEmit?] | ["aura", PxAura] | ["energy", PxEnergy];
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
    /** px to an art pixel: a scene's pixel (its sizes), 1 elsewhere. */
    readonly k: number;
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
    /** A drawing in its turn among a sorted layer's (or a c.sort()'s) stamps: at depth z / row y, ties in call order; outside one, now. */
    z(z: number, fn: (c: PxCanvas) => void): void;
    y(y: number, fn: (c: PxCanvas) => void): void;
    /** What fn stamps and hands to c.z() / c.y() drawn in that order when it ends. */
    sort(by: "y" | "z", fn: () => void): void;
    /** What fn paints, a placement by that name (id: which one, as a stamp's): describe lists it, check reads it as a stamp (height m, facing). */
    as(name: string, fn: (c: PxCanvas) => void, opts?: { id?: string; height?: number; facing?: "right" | "left" | "front" | "back" }): void;
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
    grad(x: number, y: number, w: number, h: number, colors: string | string[], dir?: "v" | "h" | "r", soft?: number, seam?: "dither" | "lines"): void;
    noise(x: number, y: number, w: number, h: number, colors: string | string[], density?: number, seed?: number, on?: string): void;
    shade(where?: PxRegion, steps?: number, density?: number): void;
    light(where?: PxRegion, steps?: number, density?: number): void;
    relight(where?: PxRegion, opts?: PxRelight): void;
    /** Gradient map: the region's colors, dark to light, take the ramp's keys in order (hue: only colors of that hue). */
    rampmap(ramp: string | string[], opts?: { where?: PxRegion; hue?: [number, number] }): void;
    /** Move pixels by whole-pixel offsets: fn(x, y) gives [dx, dy] at a pixel's new place; it takes the color (dx, dy) behind it. */
    warp(fn: (x: number, y: number) => [number, number] | null | undefined | false | 0, where?: PxRegion): void;
    /** A shader's effect on what the canvas holds so far, in place, on its clock and seed: dissolve, pixelate, dither, tint, distort, sway, emit. */
    effect(...fx: PxEffect): void;
    /** Flat ground in perspective, row by row: fn(x, z) gives the color at x m across, z m away ("." or nothing: leave it). */
    plane(view: PxView | PxPerspective, fn: (x: number, z: number, col: number, row: number) => PxColor | null | undefined, where?: PxRegion): void;
    /** A tapered capsule painted round (px), shaded across toward the light along `ramp`, a rim on the lit edge. */
    capsule(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, ramp: string, opts?: { light?: [number, number]; rim?: boolean }): void;
    /** Flames rising from (x, y), about `size` px tall, flickering with the frame, leaning with `wind`; `keys` root to tip, the last for edges. */
    flame(x: number, y: number, size: number, keys: string, opts?: { wind?: number; period?: number; seed?: number; frame?: number }): void;
    /** A strip that wraps going by, `per` px a loop (a whole number of its widths): a parallax plane. */
    scroll(name: string, y: number, per: number, opts?: { x?: number; y?: number; frame?: number; axis?: "x" | "y" }): void;
    /** How far something going `per` px a loop has moved at this frame (whole px). */
    moved(per: number): number;
    /** Where something crossing in a loop is now: from x0, per a loop (default span), wrapped into the strip span wide from `from`; whole px unless whole: false. */
    cross(x0: number, opts: { span: number; per?: number; from?: number; whole?: boolean }): number;
    /** A lane of cumulus drifting one slot a loop while each turns into the next. */
    clouds(opts: PxClouds): void;
    /** Smoke, steam or dust from a point, in a loop that closes. */
    plume(x: number, y: number, keys: string, opts?: PxPlume): void;
    /** Smoke of a shape: a column on a path, a puff, a bank drifting, a ring spreading (keys lit, middle, shaded). */
    smoke(x: number, y: number, keys: string | string[], opts?: PxSmoke): void;
    /** An emitter's particles now, each in the key of its age (young first), streaked `trail` ms back. */
    particles(emit: (t: number) => PxParticle[], keys: string | string[], opts?: { x?: number; y?: number; trail?: number; size?: [number, number] }): void;
    /** A trail behind what goes along path(t), `length` ms of it now, `width` [head, tail] px, keys head to tail; a blade's, path(t, i) giving its edge [[tip], [inner point]]: the band it swept. */
    trail(path: (t: number, i: number) => number[] | number[][], keys: string | string[], opts?: PxTrail): void;
    /** A spell as it is now: its mark, what gives light (emitting, unlit), its smoke, its lamps, its flash and shake (`shake: false`: none); after a mesh() through its camera, at its depth. */
    cast(spell: PxSpell, opts?: { shake?: boolean }): void;
    /** All drawn so far thrown by a spell's shake now, or [dx, dy] px. */
    shake(by: PxSpell | number, dy?: number): void;
    /** Where a socket of an earlier placement is ("hero.hand"), in canvas coords. */
    socket(at: string): [number, number];
    /** A socket of what is being drawn, here in this frame (a hand that moves with the pose). */
    setSocket(name: string, x: number, y: number): void;
    /** A box of this frame an engine reads (a fighter's "hit", "hurt"), by kind, in whole px; each call adds one: the sheet's JSON gives them with the frame. */
    setBox(kind: string, x: number, y: number, w: number, h: number): void;
    /** This frame's data for an engine ({ phase: "active", damage: 8 }), merged; the sheet's JSON gives it with the frame. */
    setData(data: Record<string, unknown>): void;
    /** Where a socket of a sprite standing in mesh() is, in meters [x, z, up] ({ name, at, frame?, flip? }, pixel px to its pixels). */
    meshSocket(view: PxView | PxPerspective, sprite: { name: string; at: number[]; frame?: number; flip?: "x"; delay?: number }, socket: string, pixel?: number): [number, number, number];
    /** Shapes in meters drawn far to near through the camera (solid.stick, blob, box, cone, poly). */
    solids(view: PxView | PxPerspective, shapes: PxSolid[], opts?: PxSolidOpts): void;
    /** Flat faces in meters (model()) through the camera, the nearest per pixel, toned along their material's ramp, outlined where a surface ends. */
    mesh(view: PxView | PxPerspective | PxSurfaceView | PxProject, faces: PxFace[], mats: Record<string, PxMaterial>, opts?: PxMeshOpts): void;
    /** A distance field drawn as pixel art: ramps stepped by the light, an outline away from it, its normals and depth; through a camera after a mesh(), at its depth, its shadow on what is drawn. */
    surface(field: PxSdf, opts?: PxSurfaceOpts): void;
    /** A voxel grid, or a field made voxels of `size` m now, drawn as pixel-art cubes: a tone a face, the outline on the shaded side; iso and top on the pixel grid. */
    voxels(grid: PxVoxels | PxSdf, opts?: PxVoxelOpts): void;
    /** A density drawn as pixel art: ray-marched through its own light, its ramp in clusters, dithered where thin; through a camera at its depth, its shadow and glow on what is round it. */
    volume(density: PxDensity, opts?: PxVolumeOpts): void;
    /** Gaussian splats (or a field or density made splats now) rasterized to pixel art, the nearest first. */
    splats(set: PxSplats | PxSdf | PxDensity, opts?: PxSplatOpts): void;
    /** Hand-drawn pixel art pinned (or wrapped) on a field's surface, crisp in any camera, after the surface(). */
    decal(name: string, opts?: PxDecalOpts): void;
    /** A world drawn through a view: its solids, their details and decals, its air. */
    draw3d(thing: PxWorld | PxSdf | PxBuilt, opts?: PxDraw3dOpts): void;
    /** The same shapes' shadows on the ground, from the sun: each ground color turned into its shade. */
    shadows(view: PxView | PxPerspective, shapes: PxSolid[], opts: PxSolidOpts & { sun: PxSun; shade: Record<string, string> }): void;
    /** Land with relief in perspective, ray-marched: height(x, z) in meters; fn gives the color of the point each pixel sees. */
    terrain(view: PxView | PxPerspective, height: (x: number, z: number) => number, fn: (x: number, z: number, u: number, t: number, col: number, row: number) => PxColor | null | undefined, opts?: PxTerrainOpts): void;
    recolor(map: Record<string, PxColor>, where?: PxRegion, density?: number): void;
    stamp(name: string, x?: number, y?: number | "ground", opts?: PxPlace): void;
    stamp(name: string, opts: PxPlace): void;
    tile(name: string, x: number, y: number, cols?: number, rows?: number, opts?: PxPlace): void;
    pattern(name: string, x: number, y: number, w: number, h: number, opts?: PxPlace): void;
    panel(name: string, x: number, y: number, w: number, h: number, opts?: PxPlace): void;
    tilemap(map: string, opts: PxTilemap): void;
    scatter(name: string, x: number, y: number, w: number, h: number, count: number, opts?: PxScatter): void;
    grid(x: number, y: number, str: string): void;
    runs(rows: Record<number, [number, string][]>): void;
    pose(joints: Record<string, number[]>, opts?: PxPose): void;
    wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: PxColor, opts?: PxWire): void;
    text(x: number, y: number, str: string | number, c: PxColor | ((i: number, ch: string) => PxColor | null | undefined), opts?: PxText): void;
    bubble(x: number, y: number, title: string | number, lines: string | string[], opts: PxBubble): void;
    /** A labelled contact sheet: rows of assets (or [name, label]) gap px apart from at; head titles over the columns, side ones left of the rows. */
    cells(rows: (string | [string, string | number])[][], opts?: PxCells): void;
    lamp(x: number, y: number, opts?: PxLamp): void;
    bump(shape?: PxBumpShape, opts?: PxBump): void;
    normals(x: number, y: number, str: string): void;
  }

  /** A built-in palette, a palette file (.hex .gpl .pal .txt, relative to the art file) or a color list. */
  function use(palette: "pico8" | "sweetie16" | "db16" | "endesga32" | "gray8" | `${string}.${"hex" | "gpl" | "pal" | "txt" | "png"}` | (string | number)[]): void;
  /** Add or override keys (hex, palette index, another key). Giving a key one of the file's ramps runs through another color is a warning. */
  function pal(keys: Record<string, string | number>): void;
  function ramps(...darkToLight: string[]): void;
  /** Define keys (dark to light) as hue-shifted shades of `base` and add them as a ramp; base sits at `at` (default the middle). */
  function shades(keys: string, base: PxColor, opts?: { hue?: number; at?: number; sat?: number }): void;
  /**
   * A swap by role: each role's keys in `from` ({ primary: "aAbB" }, dark to light) to that role's in `to`
   * (keys "cCdD" or colors ["#123", ...], as many); roles `to` leaves out keep theirs. A livery, a palette slot.
   */
  function roleSwap(from: Record<string, string>, to: Record<string, string | PxColor[]>): Record<string, PxColor>;
  /**
   * A profile as data (fighting, action top-down, racing): the fields the file reads, given back with
   * `name`; pxl check runs its `checks` on the assets naming it (`genre: "fighting"`). Other fields are kept.
   */
  function genre(name: string, spec: PxGenre): PxGenre & { name: string };
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
  function sheet(name: string, entries: string[], opts?: { cols?: number; pad?: number; extrude?: number; /** each animation on a row of its own */ rows?: "tag";
    /** palette slots: { jade: swap }, keys to colors; the JSON gets meta.palette and meta.slots, a .hex each */ slots?: Record<string, Record<string, string>> }): void;
  /** A bitmap font from glyphs drawn in w x h cells on a sprite, in the order of `chars`; use it with text(..., { font }). */
  function font(name: string, sprite: string, opts: { chars: string; w: number; h: number; cols?: number; mono?: boolean }): void;
  /** n directions (sprites name_0.. + group name) from a pose pointing up, via exact quarter turns and diagonal mirrors where possible. See rotation.md. */
  /**
   * A thing in 3D (a field, a built thing, a world's part) seen from n headings (8; an iso view's 4 its
   * diagonals) or those named, a sprite each (an anim with frames), named by the compass (n, nne, ne, ...;
   * else their index), a group of them; through an orthographic view or a perspective() camera; the east
   * the west flipped where the thing is its own mirror and its light from the picture's middle (mirror: "auto").
   */
  function turnaround(name: string, thing: PxSdf | PxBuilt | PxWorld, opts?: { view?: PxSurfaceView; ppm?: number; n?: number; headings?: (string | number)[]; part?: string; mats?: Record<string, unknown>; light?: number[] | "view"; as?: PxAs; size?: number; spacing?: number; surface?: Record<string, unknown>; draw?: (c: PxCanvas, v: { heading: string; screen(p: number[]): number[]; depth(p: number[]): number }) => void; frames?: number; fps?: number; mirror?: boolean | "auto"; pad?: number; /** the genre() its sprites are made for */ genre?: string }): PxTurnaround;
  /**
   * A figure on the 3D layer: a skeleton (`body`) posed per frame by the file's own `pose(i, heading)`,
   * its parts fields along the bones (`parts(j, pose)`: j.limb, j.ball or fields, each painted by a
   * material or a hook), drawn by surface() from the side (`pitch`, 20) in every heading asked (n: 4, 8,
   * 16, or `headings`): anims name_<move>_<dir>, groups name_<move>; the east the west's mirror where the
   * light is in the picture's middle; `head` a views() set stamped on the head (`chin` a line under it).
   * `blocks`: the flat blocks too (bk_<move>_<dir>, or that prefix), to judge a move before painting.
   */
  function rig3d(name: string, opts: { body?: PxBody; moves: Record<string, { frames: number; /** each frame's (100), or a list, a number a frame */ ms?: number | number[]; pose: (i: number, heading: number) => PxPose; dirs?: string[]; draw?: (c: PxCanvas, j: PxJoints, pose: PxPose) => void }>;
    n?: number; headings?: (string | number)[]; pitch?: number; w?: number; h?: number; pivot?: [number, number]; parts?: (j: PxJoints, pose: PxPose) => Record<string, PxPiece | PxSdf | { decal: object } | { scatter: object } | (PxPiece | PxSdf | { decal: object } | { scatter: object })[]>;
    mats?: Record<string, unknown>; light?: PxV3; outline?: boolean | PxColor; inner?: boolean | PxColor; ink?: PxColor; surface?: Partial<PxSurfaceOpts>; head?: string; /** the line under the head; a head modeled: [key, the skin's ramp], under the jaw only */ chin?: PxColor | [PxColor, string]; blocks?: boolean | string; mirror?: boolean | "auto"; draw?: (c: PxCanvas, j: PxJoints, pose: PxPose) => void; /** the genre() its painted moves are made for */ genre?: string }): PxRig3d;
  /**
   * Hand-drawn views of a thing (a head), named by the compass ({ s, sw, w, nw, n }: grids, rows, or items):
   * a sprite each, pivoted on its `anchor` pixel ([col, row], per view or one for all; "center", "bottom"),
   * the views not drawn the mirrors of those across; a group `name` to stamp by heading. pxl check holds
   * their crown and chin to one row, and with `like` each row within a pixel of that set's.
   */
  /** A head modeled (a field in its own frame), drawn once per view (the west, the east mirrored where the light is in the middle), each view's `retouch` grid painted over it ("." keeps, "_" erases), its `anchor` on the head's middle. */
  function views(name: string, field: PxSdf, opts?: { n?: 8 | 16; pitch?: number; light?: PxVec; mats?: Record<string, unknown>; surface?: Record<string, unknown>; ink?: string; jaw?: [string, string]; anchor?: [number, number] | Record<string, [number, number]>; retouch?: Record<string, string>; like?: string; chin?: number; swap?: Record<string, PxColor> }): string[];
  function views(name: string, grids: Record<string, string | string[] | PxItem[]>, opts?: { anchor?: [number, number] | "center" | "bottom" | Record<string, [number, number] | "center" | "bottom">; like?: string; /** the chin's row in every grid (a set whose lowest rows aren't the chin: a beard) */ chin?: number; swap?: Record<string, PxColor>; outline?: PxColor; outline8?: PxColor; inline?: PxColor; selout?: boolean | number }): string[];
  /** A walk's numbers at t (0..1 over the cycle) by the view a heading gives (or `view`): each foot [forward, up], the body's dip, each hand [forward, up] from hanging; the guide's measured values, each overridable (`stride`, `lift`, `bob`, `hands`; for one view: `profile: { stride }`). */
  function gait(t: number, opts?: { heading?: number; view?: "front" | "back" | "diagonal" | "profile"; stride?: number | number[]; lift?: number | number[]; bob?: number[]; hands?: number[][]; front?: object; diagonal?: object; profile?: object }): { view: string; a: number; feet: [number, number][]; bob: number; hands: [number, number][]; pace: number };
  /** Two bones of lengths l1 and l2 from a reaching for b in 3D: the joint between, pushed toward `hint` (a way); out of reach, straight. */
  function ik3(a: PxV3, b: PxV3, l1: number, l2: number, hint: PxV3): PxV3;
  function directions(name: string, n: number, opts: { from: string; outline?: PxColor; outline8?: PxColor; symmetric?: boolean; rotate?: "auto" | "rotsprite" | "shear" | "nearest"; draw?: Record<string, string>; pivot?: "bottom" | "center" | [number, number] }): void;
  /**
   * palette: true keeps the included file's use()/pal()/ramps() active afterwards (else its palette
   * stays with its own assets). as: the names it defines go under `as.` ("nature": its "lamp" is
   * "nature.lamp" here), its own drawing finding its own first; JavaScript names still share one scope.
   */
  function include(path: string, opts?: { palette?: boolean; as?: string }): void;
  function rng(seed?: number): () => number;
  /** A number in [0, 1) for a lattice point (integers): the same (i, j) always gives the same. */
  function hash(i: number, j: number, seed?: number): number;
  /** Smooth value noise in [0, 1], one unit a cell. */
  function vnoise(x: number, y: number): number;
  /** Octaves of vnoise, finer and fainter each, in [0, 1] (default 4): billows, clouds, rock. */
  function fbm(x: number, y: number, octaves?: number): number;
  /** Ordered-dither threshold in (0, 1) for pixel (x, y) (a 4x4 Bayer matrix). */
  function bayer(x: number, y: number): number;
  /** Vectors as arrays (any length; dot and cross in 3D): add, sub, mul by a number, dot, cross, len, unit (length 1; [0, 0, 0] as it is). */
  const vec: {
    add(a: number[], b: number[]): number[]; sub(a: number[], b: number[]): number[]; mul(a: number[], k: number): number[];
    dot(a: number[], b: number[]): number; cross(a: number[], b: number[]): number[]; len(a: number[]): number; unit(a: number[]): number[];
  };
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
  function scroll(name: string, y: number, per: number, opts?: { x?: number; y?: number; frame?: number; axis?: "x" | "y" }): PxOp;
  function clouds(opts: PxClouds): PxOp;
  function plume(x: number, y: number, keys: string, opts?: PxPlume): PxOp;
  /** Smoke of a shape: a column on a path, a puff, a bank drifting, a ring spreading (keys lit, middle, shaded). */
  function smoke(x: number, y: number, keys: string | string[], opts?: PxSmoke): PxOp;
  /** An emitter's particles now, each in the key of its age. */
  function particles(emit: (t: number) => PxParticle[], keys: string | string[], opts?: { x?: number; y?: number; trail?: number; size?: [number, number] }): PxOp;
  /** A trail behind what goes along path(t); a blade's smear, the band its edge [[tip], [inner point]] swept. */
  function trail(path: (t: number, i: number) => number[] | number[][], keys: string | string[], opts?: PxTrail): PxOp;
  /** Values keyed in time: tween([{ t: 0, yaw: 60 }, { t: 4 }, { t: 6, yaw: 90 }], { moments }) gives at(t); each key carries what it doesn't say, numbers eased, the rest held. */
  function tween(keys: ({ t: number } & Record<string, unknown>)[], opts?: { moments?: string[] }): (t: number) => Record<string, any> & { t: number };
  /** [frames, value] runs as a value a frame ([frames, a, b] holds [a, b]). */
  function unroll(runs: [number, ...unknown[]][]): unknown[];
  /** A value lagging a loop's, a frame each: eased toward each value by 1 - damp a frame, or (peak) falling back at damp from each peak; its first frame after its last. */
  function follow(values: number[], opts?: { damp?: number; peak?: boolean }): number[];
  /** A figure's legs and holds on the clock: route({ pace, origin, ground, walk, idle, loop }, [[x, z], [x, z], { hold: 40, name: "talk" }, ...]); `px: true` a flat scene's, points [x, y] on the picture (up is n), pace px a frame. */
  function route(opts: { pace?: number | ((dir: string) => number); origin?: number[]; ground?: (x: number, z: number) => number; climb?: boolean; walk?: string | { anim: string; frame?: (f: number, t: number) => number; flip?: boolean }; idle?: string | { anim: string; frame?: (f: number, t: number) => number; flip?: boolean }; loop?: number; round?: number; px?: boolean },
    steps: (number[] | { to: number[]; name?: string; dir?: string; anim?: string | { anim: string; frame?: (f: number, t: number) => number; flip?: boolean }; frame?: (f: number, t: number) => number } | { hold: number; name?: string; dir?: string; anim?: string | { anim: string; frame?: (f: number, t: number) => number; flip?: boolean }; frame?: (f: number, t: number) => number })[]): PxRoute;
  /** A figure turning to a target (a sprite, a point, a direction, null; or a function of the frame giving one) a direction every `every` frames: (f) => its sprite. */
  function turnToward(anim: string, at: number[], target: unknown, opts?: { every?: number; rest?: string; within?: number; from?: number; frame?: (f: number) => number }): (f: number) => { name: string; at: number[]; frame: number };
  /** A spell's phases on the clock: ability([["charge", 600], ["cast", 150], ["travel", 500], ...], { start, events }). */
  function ability(phases: [string, number][] | Record<string, number>, opts?: { start?: number; events?: Record<string, [string, number]> }): PxAbility;
  /** Seeded particles: (t) gives the ones alive at time t, each where its own path puts it. */
  function emitter(opts: PxEmitter): PxEmitted;
  /** A whole cast of an element at a tier (1 fire, 2 fira, 3 firaga): spell("fire", 3, { from: [x, y], to: [x, y], ground }); draw it with cast(). */
  function spell(element: string | PxElement, tier: 1 | 2 | 3, opts: PxSpellOpts): PxSpell;
  /** A spell as it is now (see PxCanvas.cast). */
  function cast(spell: PxSpell, opts?: { shake?: boolean }): PxOp;
  /** All drawn so far thrown by a spell's shake now: a whole scene shaking from a cast in one cell of it (cast there with shake: false). */
  function shake(spell: PxSpell): PxOp;
  /** A function of (x, y) made to close over w (and h): for noise on strips and tiles that wrap. */
  function seamless(fn: (x: number, y: number) => number, w: number, h?: number): (x: number, y: number) => number;
  /** A corner terrain's 16 pieces, `prefix_<mask>` (variants: `prefix_<mask>_<v>` and a group), from fn(x, y, t, v): t how much terrain the corners give that pixel; null leaves it clear. */
  function corners(prefix: string, opts: { size: number; variants?: number; smooth?: boolean }, fn: (x: number, y: number, t: number, v: number) => PxColor | null | undefined): void;
  /** A ground (or a ceiling) as a polyline [x0, y0, x1, y1, ...], x going up: (x) => its row there, rounded. */
  function profile(pts: number[]): (x: number) => number;
  /** A path as a polyline [x0, y0, x1, y1, ...] px, its corners rounded `round` px: (x, y) => [s, u], how far along it (px) and to its right (px, negative to its left); `.total` its length along. */
  function lane(pts: number[], opts?: { round?: number }): PxLane;
  /** Shapes in meters drawn far to near through the camera (solid.stick, blob, box, cone, poly); boxes' faces lit by the sun. */
  function solids(view: PxView | PxPerspective, shapes: PxSolid[], opts?: PxSolidOpts): PxOp;
  /** The same shapes' shadows on the ground, from the sun: each ground color turned into its shade by `shade`. */
  function shadows(view: PxView | PxPerspective, shapes: PxSolid[], opts: PxSolidOpts & { sun: PxSun; shade: Record<string, string> }): PxOp;
  /** Flat faces in meters drawn through the camera with a depth per pixel (a dash round a driver, a wheel in front of its spokes): each toned along its material's ramp by how it lies to the light, outlined where a surface ends in front of another, creased where two faces of one material meet, its top edge a step lighter. Through perspective() points are [x, z, up]; a function camera takes [x right, y up, z ahead] from the eye. */
  function mesh(view: PxView | PxPerspective | PxSurfaceView | PxProject, faces: PxFace[], mats: Record<string, PxMaterial>, opts?: PxMeshOpts): PxOp;
  /** A distance field drawn as pixel art from the side, the top, in iso, or through a perspective() camera after a mesh(), at its depth, its shadow on what is drawn. */
  function surface(field: PxSdf, opts?: PxSurfaceOpts): PxOp;
  /** A voxel grid, or a field made voxels of `size` m at each moment, drawn as pixel-art cubes. */
  function voxels(grid: PxVoxels | PxSdf, opts?: PxVoxelOpts): PxOp;
  /** A density (a cloud, mist, smoke, a glowing orb) drawn as pixel art, on the clock. */
  function volume(density: PxDensity, opts?: PxVolumeOpts): PxOp;
  /** Gaussian splats rasterized to pixel art (experimental). */
  function splats(set: PxSplats | PxSdf | PxDensity, opts?: PxSplatOpts): PxOp;
  /** Hand-drawn pixel art pinned (or wrapped) on a field's surface. */
  function decal(name: string, opts?: PxDecalOpts): PxOp;
  /** A world3d(...) drawn through a view. */
  function draw3d(thing: PxWorld | PxSdf | PxBuilt, opts?: PxDraw3dOpts): PxOp;
  /** A scene as data: named parts made by builders, a seed each, placed by relations, a shared wind. */
  function world3d(spec: { seed?: number; wind?: { from?: "left" | "right" | "front" | "behind"; strength?: number }; parts: Record<string, PxPartSpec> }): PxWorld;
  /** Rules over a world's loop, run by pxl check. */
  function expect3d(name: string, world: PxWorld, rules: PxRule[], opts?: { frames?: number; ms?: number }): void;
  /** Builders with semantic parameters: make3d.tree({ canopy, twist, leaves, wind }), pine({ height, tiers, girth, snow }), bush({ size, leaves }), rock({ moss }), house({ snow, door, window, sign }), crystal({ rune, moss }), mist({ color }), smoke(). */
  const make3d: Record<"tree" | "pine" | "bush" | "rock" | "house" | "crystal" | "mist" | "smoke" | (string & {}), (params?: Record<string, unknown>) => PxBuilt> & {
    /** A builder of the file's own: fn(params) returns { field } or { density, look } (and parts, details, decals, sockets); params: a number's range [lo, hi] or a word's list, refused outside it; wind: it sways. */
    define(name: string, fn: (params: Record<string, any>) => Partial<PxBuilt>, opts?: { params?: Record<string, [number, number] | string[]>; wind?: boolean }): void;
  };
  /** The light and materials the 3D ops take when a call doesn't give them (mesh()'s light; surface, voxels, volume, splats, decal, draw3d, export3d), for the assets defined after it, as pal() and ramps() are. */
  function look3d(o: { light?: PxV3; mats?: Record<string, string | PxColor[] | { ramp: string | PxColor[]; shine?: number }> }): void;
  /** Written by build: a grid as name.vox (and .obj/.glb of its blocks), a mesh as name.obj (+ .mtl) and name.glb, Y up; each read back. */
  /** A function of the clock with frames: n moments of its loop: an animated .glb, a file a moment for the others. */
  function export3d(name: string, thing: PxVoxels | PxMesh3 | PxSplats | ((c: PxClock) => PxVoxels | PxMesh3 | PxSplats), opts?: { mats?: Record<string, string | PxColor[] | { ramp: string | PxColor[] }>; as?: ("vox" | "obj" | "glb" | "ply")[]; frames?: number; fps?: number }): void;
  /** Fields in 3D, in meters ([x, y ahead, z up]): primitives (round the origin; cylinder and cone standing on it), joins, and the other kinds made from a distance. */
  const sdf: {
    sphere(r: PxNum): PxSdf; box(size: PxVec | PxNum, o?: { round?: PxNum }): PxSdf; capsule(a: PxVec, b: PxVec, r: PxNum, r2?: PxNum): PxSdf;
    cylinder(r: PxNum, h: PxNum): PxSdf; cone(r: PxNum, h: PxNum, top?: PxNum): PxSdf; torus(R: PxNum, r: PxNum): PxSdf;
    plane(n?: PxVec, h?: PxNum): PxSdf; ellipsoid(r: PxVec): PxSdf;
    /** a field of the file's own: its distance at a point (or less), inside the box lo..hi */
    field(d: (x: number, y: number, z: number) => number, lo: [number, number, number], hi: [number, number, number]): PxSdf;
    union(...a: (PxSdf | PxSdf[] | { smooth?: PxNum })[]): PxSdf; intersect(...a: (PxSdf | PxSdf[] | { smooth?: PxNum })[]): PxSdf;
    /** seeded 3D noise in [0, 1] */ fbm(x: number, y: number, z: number, seed?: number, octaves?: number): number;
    occupancy(f: PxSdf): { kind: "occupancy"; inside(p: number[], clock?: PxClock): boolean };
    density(f: PxSdf, o?: PxDensityOpts): PxDensity;
    appearance(f: PxSdf): { kind: "appearance"; at(p: number[], n?: number[], clock?: PxClock): string | null };
    /** a sprite's size for the field (or a grid, or a field as voxels of `size`) in an orthographic view, and its pivot (where its origin lands) */
    size(f: PxSdf | PxVoxels, o?: { view?: PxSurfaceView; ppm?: number; px?: number; size?: number | number[]; pad?: number; frames?: number }): { w: number; h: number; pivot: [number, number] };
    /** the field as a voxel grid, cells `size` m (or [x, y, z]), filled within `fill` half-cells of their middle (0.5) */
    voxels(f: PxSdf, o: { size: number | number[]; fill?: number; clock?: PxClock }): PxVoxels;
    /** the field as a mesh by surface nets, cells `size` m */
    mesh(f: PxSdf, o: { size: number | number[]; clock?: PxClock }): PxMesh3;
    /** splats from a field's surface (flat discs) or a density's inside (round blobs), spacing m apart */
    splats(f: PxSdf | PxDensity, o?: { spacing?: number; size?: number; seed?: number; light?: number[]; thickness?: number; clock?: PxClock }): PxSplats;
    /** details scattered on a field's surface, drawn as pixel-art brushes by splats() */
    scatter(f: PxSdf, o?: PxScatterOpts): PxSplats;
  };
  /** A model for mesh(): face(mat, ...points), strip(mat, a, b) between two lines of points, loft(mat, sections), box(mat, corner, corner); faces holds them. */
  function model(): {
    faces: PxFace[];
    face(mat: string, ...pts: PxV3[]): number;
    strip(mat: string, a: PxV3[], b: PxV3[]): void;
    loft(mat: string, sections: PxV3[][]): void;
    box(mat: string, a: PxV3, b: PxV3): void;
    /** A polygon [[x, z], ...] raised from u0 to u1: its top of one material, its sides of another (no bottom). */
    prism(top: string, side: string, pts: number[][], u0: number, u1: number): void;
    /** A square stick from a to b, r half its width. */
    stick(mat: string, a: PxV3, b: PxV3, r?: number): void;
  };
  namespace model {
    /** Faces turned th radians about the axis through c along the unit way d, then lifted: a hull on its bob. */
    function turn(faces: PxFace[], c: PxV3, d: PxV3, th: number, lift?: number): PxFace[];
    /** A point turned so: what rides the hull. */
    function turnPoint(p: PxV3, c: PxV3, d: PxV3, th: number, lift?: number): PxV3;
  }
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
  function grad(x: number, y: number, w: number, h: number, colors: string | string[], dir?: "v" | "h" | "r", soft?: number, seam?: "dither" | "lines"): PxOp;
  function noise(x: number, y: number, w: number, h: number, colors: string | string[], density?: number, seed?: number, on?: string): PxOp;
  function shade(where?: PxRegion, steps?: number, density?: number): PxOp;
  function light(where?: PxRegion, steps?: number, density?: number): PxOp;
  /** Volume for flat art: edges facing the light step lighter along their ramp, edges facing away darker. */
  function relight(where?: PxRegion, opts?: PxRelight): PxOp;
  /** Gradient map onto a ramp: colors sorted dark to light take its keys in order, so imported tones never merge (hue: [from, to] picks colors). */
  function rampmap(ramp: string | string[], opts?: { where?: PxRegion; hue?: [number, number] }): PxOp;
  /** Move pixels by whole-pixel offsets (breathing, hair and tails swaying, a body on a slope): fn(x, y) gives [dx, dy] at a pixel's new place. */
  function warp(fn: (x: number, y: number) => [number, number] | null | undefined | false | 0, where?: PxRegion): PxOp;
  /** A shader's effect on everything drawn before it (a sprite, an anim's frame, a layer), on the clock and a seed: dissolve, pixelate, dither, tint, distort, sway, emit. */
  function effect(...fx: PxEffect): PxOp;
  function recolor(map: Record<string, PxColor>, where?: PxRegion, density?: number): PxOp;
  function stamp(name: string, x?: number, y?: number | "ground", opts?: PxPlace): PxOp;
  function stamp(name: string, opts: PxPlace): PxOp;
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
  function text(x: number, y: number, str: string | number, c: PxColor | ((i: number, ch: string) => PxColor | null | undefined), opts?: PxText): PxOp;
  /** A dialogue box over a speaker: title over lines in a 9-slice sized to them, its tail down to (x, y) (art px), the prompt in its corner. */
  function bubble(x: number, y: number, title: string | number, lines: string | string[], opts: PxBubble): PxOp;
  /** A labelled contact sheet: rows of assets (or [name, label]) gap px apart from at; head titles over the columns, side ones left of the rows. */
  function cells(rows: (string | [string, string | number])[][], opts?: PxCells): PxOp;
  function lamp(x: number, y: number, opts?: PxLamp): PxOp;
  function bump(shape?: PxBumpShape, opts?: PxBump): PxOp;
  function normals(x: number, y: number, str: string): PxOp;
  function lighting(opts?: PxLighting): PxOp;
  /** A halo round every pixel of these keys or colors, or of a 3D material (its ramp: glow(trees.mats.sakura_blossom)). */
  function glow(keys: string | string[] | { ramp: string | string[] }, opts?: PxGlow): PxOp;
  /** The camera's after-effects on the whole picture (HD-2D): depth of field by mesh()'s depth, bloom, haze, vignette. After the mesh(), in the sprite or scene itself. */
  function post(opts?: PxPost): PxOp;
}
