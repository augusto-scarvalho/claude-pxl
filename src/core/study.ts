// pxl study: learning from finished art and references. A picture, a GIF or a video is read for what
// it is made of, and the numbers (vision.ts) are put as a report to read, with what to use in pxl to
// make the same thing, a sheet to look at, and the palette.
//
// Pixel art and everything else are read differently. Pixel art is read as it was drawn: its grid
// found and the image taken back to 1x, so every pixel is one the artist placed; then its palette and
// ramps, and the techniques (outlines, dithering, anti-aliasing, clusters, the light, tiles) are
// counted there. A photo, a painting or a render has no pixels to read that way: it is read for what a
// pixel artist takes from it (the masses of light and dark, the colors reduced to a palette of ramps,
// the light's color against the shadows', the haze with distance) and translated into a small picture
// in few colors to draw over. Both are read for their perspective (straight edges and where they
// meet) and, moving, for their motion (a cycle, a loop, planes going by, a scene opening out from the
// point it moves toward, the parts that move while the rest stands still).
import { type Color, TRANSPARENT, pack, toHex } from "./color.ts";
import { Img } from "./image.ts";
import { type Piece, decompose } from "./decompose.ts";
import { type Flow, type Grid, type Ramp, type Segment, type Techniques, type Vanish, areaDown, bandShifts, blockFlow, clearChecker, clearReflection, colorCounts, dE, findChecker, findGrid, findReflection, findRamps, findSegments, findTiles, findVanishing, focusOfExpansion, frameDiff, lab, lch, lineFlaws, lumaOf, mergeNear, pixelate, quantize, techniques, toNative } from "./vision.ts";

/** frames as read; `drawnAt`: they were already brought down from that grid as they were read (big animations) */
export interface StudyInput { name: string; frames: Img[]; ms: number[]; kind: string; drawnAt?: Grid }
export interface StudyOpts { colors?: number; to?: [number, number]; /** the size of a pixel, when the grid found is wrong */ px?: number; /** the clip is a region asked for (--at, its corner at 1x): follow what moves in it */ region?: [number, number] }
/** pieces: each object of an animation alone (a row of cutouts each) and its box in every frame */
export interface StudyOut { text: string[]; sheet: Img; picture: Img; pixelArt: boolean; palette: Color[]; pieces?: { sheet: Img; json: unknown; strips: Img[] }; layers?: ReturnType<typeof decompose> }

const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0}%`;
const hex = (c: Color) => toHex(c).slice(0, 7);
const way = ([x, y]: [number, number]) => {
  const a = (Math.atan2(-y, x) * 180) / Math.PI;                         // 0 right, 90 up
  const names = ["the right", "the upper right", "above", "the upper left", "the left", "the lower left", "below", "the lower right"];
  return names[Math.round((((a % 360) + 360) % 360) / 45) % 8];
};
const hueName = (h: number) => (h < 15 || h >= 350 ? "pinks and reds" : h < 55 ? "reds and oranges" : h < 95 ? "oranges and browns" : h < 125 ? "yellows" : h < 165 ? "greens" : h < 215 ? "teals and cyans" : h < 290 ? "blues" : "purples and magentas");

export function study(input: StudyInput, opts: StudyOpts = {}): StudyOut {
  const first = input.frames[0], text: string[] = [];
  const pre = !!input.drawnAt, g = input.drawnAt ?? findGrid(first, opts.px), up = g.sx > 1 || g.sy > 1;
  // a copy that was blurred, compressed or scaled by a fraction has its colors smeared: fold them harder
  const smeared = !Number.isInteger(g.sx) || /JPG|JPEG|WEBP|video/i.test(input.kind);
  // the checker an editor shows for clear, exported with it: taken for clear before anything is read
  const raw = up && !pre ? toNative(first, g) : first, checker = smeared ? null : findChecker(raw);
  const unchecker = (f: Img) => (checker ? clearChecker(f, checker) : f);
  // pixel art: few colors and hard steps between them, once a copy's noise is folded away; a grid
  // found under the noise says so too
  const folded0 = mergeNear(unchecker(raw), smeared ? 0.07 : 0.03), smooth = smoothShare(folded0);
  const pixelArt = colorCounts(folded0).size <= 256 && (up || smooth < 0.35);
  // and a reflection under it (a floor that shines): told and left out of the rest
  const raws = input.frames.map((f, i) => (i ? (pixelArt && up && !pre ? toNative(f, g) : f) : raw));
  const reflection = pixelArt && !smeared ? findReflection(raws, checker) : null;
  const clear = (f: Img) => (reflection ? clearReflection(unchecker(f), reflection, checker) : unchecker(f));
  const native = clear(raw), folded = reflection ? mergeNear(native, smeared ? 0.07 : 0.03) : folded0, nColors = colorCounts(folded).size;
  const dur = input.ms.reduce((s, v) => s + v, 0);
  text.push(`${input.name}: ${pre ? `${Math.round(first.w * g.sx)}x${Math.round(first.h * g.sy)}` : `${first.w}x${first.h}`}${input.frames.length > 1 ? `, ${input.frames.length} frames over ${(dur / 1000).toFixed(1)} s` : ""} (${input.kind})`);
  if (checker) text.push(`Clear: the transparency checker (${hex(checker.a)} and ${hex(checker.b)} in ${checker.size} px squares, as an editor shows what is clear) was exported with it: taken for clear, so it isn't read as the picture's colors.`);
  if (reflection) text.push(`Reflection: below row ${reflection.axis}, what is above it mirrored over ${reflection.floor !== undefined ? `the floor (${hex(reflection.floor)})` : "what's behind"} at about ${Math.round(reflection.alpha * 100)}% (a floor that shines, still water; ${pct(reflection.share * 100, 100)} of what is below it): the same drawing stamped flipped (flip: "y") in a layer with opacity: ${reflection.alpha.toFixed(2)}; left out of the rest of this reading.`);

  // the picture studied: the drawing at 1x, or a translation of the rest into few colors
  let picture: Img, scale = 1, avg: Img;
  if (pixelArt) {
    picture = folded; avg = folded;
    text.push(`Kind: pixel art${up ? `, drawn at ${g.sx === g.sy ? `${+g.sx.toFixed(2)}x` : `${+g.sx.toFixed(2)}x${+g.sy.toFixed(2)}`} (each pixel ${+g.sx.toFixed(2)}x${+g.sy.toFixed(2)} px, the grid from ${+g.ox.toFixed(1)},${+g.oy.toFixed(1)})${Number.isInteger(g.sx) ? "" : ": blurred or scaled by a fraction, read in the middle of each pixel"}` : " at 1x"}: ${picture.w}x${picture.h} as drawn, ${nColors} colors.`);
  } else {
    const [tw, th] = opts.to ?? fit(first.w, first.h, 160);
    // the values read off a plain average; the translation by superpixels (Gerstner et al. 2012), which keeps edges
    avg = areaDown(first, tw, th);
    const q = quantize(pixelate(first, tw, th), opts.colors ?? 16);
    picture = q.img; scale = tw / first.w;
    text.push(`Kind: not pixel art (a photo, painting or render: ${nColors} colors after folding near ones, ${pct(smooth * 100, 100)} of the steps between neighbors gentle). Read for its masses, colors and light, and translated into a ${tw}x${th} picture in ${q.palette.length} colors to draw over (--to WxH, --colors N).`);
  }
  // a sprite on a flat backdrop (a tutorial's panel): the color all round the border is taken for clear
  // by the techniques (its edge, rim, pillow, halo) and left out of the temperature
  const backdrop = pixelArt ? flatBackdrop(picture) : null;
  const ramps = findRamps(picture), tech = techniques(backdrop === null ? picture : picture.remap(new Map([[backdrop, TRANSPARENT]])), ramps);

  // ---------------------------------------------------------------- palette and ramps
  text.push("", "PALETTE AND RAMPS (dark to light; % of the picture)");
  // (the ramps are counted over the whole picture, a flat backdrop too; the techniques without it)
  const total = tech.pixels, painted = picture.data.filter((c) => (c & 255) >= 128).length;
  ramps.slice(0, 12).forEach((r, i) => {
    const share = r.counts.reduce((s, v) => s + v, 0);
    if (share < painted * 0.004 && i > 3) return;
    text.push(`  ${i + 1}. ${r.neutral ? "greys" : hueName(lch(r.colors[Math.floor(r.colors.length / 2)]).h)}, ${r.colors.length} tone${r.colors.length > 1 ? "s" : ""}, ${pct(share, painted)}: ${r.colors.slice(0, 10).map(hex).join(" ")}${r.colors.length > 10 ? " ..." : ""}${shiftWords(r)}`);
  });
  if (ramps.length > 12) text.push(`  ... ${ramps.length - 12} more, small`);
  const sizes = ramps.filter((r) => r.colors.length > 1).map((r) => r.colors.length).sort((a, b) => a - b);
  if (sizes.length) text.push(`  ${ramps.length} ramps; a ramp's tones: ${sizes[0]} to ${sizes[sizes.length - 1]}, most ${sizes[sizes.length >> 1]}.`);
  const shift = hueShifting(ramps);
  if (shift) text.push(`  ${shift}`);
  // (a palette someone chose: a lit scene's thousands of blended tones aren't one)
  if (pixelArt && nColors <= 64) for (const line of paletteSanity(smeared ? null : native, ramps, nColors)) text.push(line);

  // ---------------------------------------------------------------- techniques
  let lf: ReturnType<typeof lineFlaws> | null = null;
  if (pixelArt) {
    text.push("", "TECHNIQUES");
    if (tech.edge) {
      const e = tech.edge, n = e.black + e.selective + e.none;
      text.push(`  Edge against the clear: ${pct(e.black, n)} near-black (an outline), ${pct(e.selective, n)} a darker shade of the inside (selective outline), ${pct(e.none, n)} the fill itself (no outline).`);
    }
    text.push(tech.lines > total * 0.01
      ? `  Inner lines: thin dark lines between lighter neighbors on ${pct(tech.lines, total)} of the pixels: ${pct(tech.selective, tech.lines)} a darker shade of what they border (selective), ${pct(tech.black, tech.lines)} near-black.`
      : `  Inner lines: hardly any (${pct(tech.lines, total)}): shapes meet by their tones, not by lines.`);
    text.push(tech.dither > total * 0.015
      ? `  Dithering: 2x2 checkers on ${pct(tech.dither, total)} of the pixels${tech.ditherRows ? `, rows ${tech.ditherRows[0]}-${tech.ditherRows[1]}` : ""}, mostly ${tech.ditherPairs.map(([a, b]) => `${hex(a)}/${hex(b)}${ditherGap(a, b, ramps)}`).join(", ")}: a blend between two tones.`
      : `  Dithering: none to speak of (${pct(tech.dither, total)}).`);
    text.push(`  Anti-aliasing: in-between tones on the steps of edges on ${pct(tech.aa, total)} of the pixels${tech.aa > total * 0.01 ? " (edges smoothed by hand)" : " (hard edges)"}.`);
    text.push(`  Clusters: ${pct(tech.orphans, total)} of the pixels stand alone (none of their four neighbors share their color; a dither's and anti-aliasing's left out)${tech.orphans > total * 0.12 ? ": a busy, noisy texture" : tech.orphans < total * 0.03 ? ": clean clusters" : ""}${tech.orphans ? `; ${tech.specks.length} speck${tech.specks.length === 1 ? "" : "s"} (a tone or two off what is round them: noise, merged into a neighbor or grown into a 2-3 px shape${tech.specks.length ? `; at ${tech.specks.slice(0, 4).map(([x, y]) => `${x},${y}`).join("; ")}${tech.specks.length > 4 ? "; ..." : ""}` : ""}), ${tech.orphans - tech.specks.length} point${tech.orphans - tech.specks.length === 1 ? "" : "s"} (standing out: a star, a glint, an eye)` : ""}.`);
    if (tech.edge && tech.edge.halo >= Math.max(3, 0.05 * (tech.edge.black + tech.edge.selective + tech.edge.none))) text.push(`  Halo: ${tech.edge.halo} edge pixels outside the dark outline, lighter than it: anti-aliased toward a background the sprite doesn't have, they fringe on any other ground; keep the outline outermost.`);
    if (tech.rim && tech.rim.r2 >= 0.15) text.push(`  Light on the silhouette (its rim's lightness fit to one light, after Johnson and Farid): from ${way(tech.rim.dir)}, r² ${tech.rim.r2.toFixed(2)} over ${tech.rim.n} rim pixels.`);
    const b = tech.banding;
    text.push(`  Banding (runs of two colors side by side with their ends lined up, or a row apart, or both ends stepping together at 45°; marked red on the sheet): ${b.pairs} pair${b.pairs === 1 ? "" : "s"}, ${b.per1000.toFixed(1)} per 1000 px${b.per1000 < 1 ? ": hardly any" : b.per1000 > 6 && b.pairs >= 12 ? ": much (it shows the grid; stagger the ends)" : ""}.`);
    // (in a palette someone chose: a lit scene's blended tones make shapes, not lines)
    lf = nColors <= 64 ? lineFlaws(picture) : null;
    if (lf && lf.line >= 20) {
      const at = (v: [number, number][]) => (v.length ? ` (at 1x: ${v.slice(0, 5).map(([x, y]) => `${x},${y}`).join("; ")}${v.length > 5 ? "; ..." : ""})` : "");
      const k = lf.corners.length, j = lf.jaggies.length, square = k >= lf.line * 0.1;
      const corners = square ? `drawn square, ${k} L-corners${at(lf.corners)}: an L at each step, a line that reads thicker and chunkier, a style (outline8 draws an outline so)`
        : k ? `${k} L-corner${k === 1 ? "" : "s"}${at(lf.corners)}: the elbow of three pixels in an L where the line could step diagonally, thickening it there; on a smooth line delete it (a box's corner stays)` : "no L-corners";
      const jaggies = j ? `${j} jagg${j === 1 ? "y" : "ies"}${at(lf.jaggies)}: a run of pixels out of order along a line (1 3 2 4 where 1 2 3 4 reads smooth); runs grow or shrink steadily, or alternate n and n+1 on a straight slope` : "no jaggies";
      text.push(`  Lines (dark, 1 px wide: ${lf.line} px): ${k + j ? `${corners}; ${jaggies}. On the sheet, L-corners are ringed orange and jaggies blue. pxl's line(), curve(), wire() and outline draw without either.` : "pixel-perfect, every step diagonal and the runs in order: clean."}`);
    }
    if (tech.pillow !== null && tech.pillow > 0.4) text.push(`  Pillow shading: lighter the farther in from the edge all round (${tech.pillow.toFixed(2)})${tech.rim && tech.rim.r2 >= 0.3 ? ", though lit from one side too" : ": lit as if from the front, which flattens the form; shade from one side instead"}.`);
    const tiles = findTiles(picture);
    if (tiles) text.push(`  Tiles: ${tiles.size}x${tiles.size} cells from ${tiles.ox},${tiles.oy} repeat: ${tiles.distinct} distinct of ${tiles.cells} (${pct(tiles.cells - tiles.distinct, tiles.cells)} repeats).`);
  }
  text.push(...lightLines(tech, ramps, pixelArt));

  // ---------------------------------------------------------------- values, color, distance
  text.push("", "VALUES AND COLOR");
  text.push(...valueLines(avg, backdrop));

  // ---------------------------------------------------------------- motion, then perspective
  let motion: ReturnType<typeof motionOf> | null = null;
  if (input.frames.length > 1) {
    const frames = input.frames.map((f, i) => (pixelArt ? clear(raws[i]) : areaDown(f, ...fit(f.w, f.h, 320))));
    motion = motionOf(frames, input.ms, smeared);
  }
  const P = pixelArt ? picture : areaDown(first, ...fit(first.w, first.h, 480));
  const segs = findSegments(P, pixelArt), vps = findVanishing(segs, P.w, P.h), k = picture.w / P.w;
  const foe = motion?.foe && motion.forward ? { x: (motion.foe.x * P.w) / motion.W, y: (motion.foe.y * P.w) / motion.W } : null;
  text.push("", "PERSPECTIVE");
  const persp = perspectiveLines(segs, vps, P.w, P.h, k, picture.w, foe);
  text.push(...persp.lines);
  if (motion) text.push("", "MOTION", ...motion.lines);
  if (opts.region && input.frames.length > 1) text.push("", "THE REGION (what moves in it, frame by frame)", ...regionLines(input.frames.map((f, i) => (pixelArt ? clear(raws[i]) : f)), opts.region));
  if (motion?.layers) text.push("", "PIECES (what moves how, and what to build it with)", ...pieceLines(motion.layers, motion.bands, motion.forward));
  else if (motion?.forward) text.push("", "PIECES", "  The whole view moves (a camera going forward): build it in meters through a camera (perspective, plane, things along the way), not as pieces on a still picture.");

  // ---------------------------------------------------------------- in pxl
  text.push("", "IN PXL");
  text.push(`  The palette: use("${input.name}.hex") (written with the sheet), ramps as listed${pixelArt ? "" : "; or reduce it: it is the translation's"}.`);
  if (pixelArt) {
    text.push(`  A picture ${picture.w}x${picture.h} at 1x.`);
    if (tech.edge && tech.edge.black > tech.edge.selective) text.push(`  Its outline: outline: "<near-black key>".`);
    else if (tech.edge && tech.edge.selective > tech.edge.none) text.push(`  Its outline: selout: "<dark key>" (the outline takes a dark shade of what it touches).`);
    if (tech.dither > total * 0.015) text.push("  Its blends: dither() between two keys, or bayer(x, y) in a function for a gradient.");
    const lit = tech.rim && tech.rim.r2 >= 0.25 ? tech.rim.dir : overallLight(tech);
    if (lit) text.push(`  Its light, from ${way(lit)} (the ramps together): relight / plate with light: [${lit.map((v) => v.toFixed(1)).join(", ")}], capsule's light the same.`);
  } else text.push(`  The translation (${input.name}_px.png) as a guide: sprite("ref", { png: "${input.name}_px.png" }) in a layer with ref: true, drawn over in the palette; the masses and the light are the lesson, not its pixels.`);
  if (persp.pxl) text.push(`  ${persp.pxl}`);
  if (motion) text.push(...motion.pxl.map((l) => `  ${l}`));

  const palette = ramps.flatMap((r) => r.colors);
  const pieces = motion?.layers && motion.layers.pieces.length ? piecesOut(motion.layers, input.ms) : undefined;
  return { text, sheet: sheet(picture, tech, pixelArt, P, segs, vps, persp.horizon, ramps, motion, lf), picture, pixelArt, palette, pieces, ...(motion?.layers ? { layers: motion.layers } : {}) };
}

const fit = (w: number, h: number, long: number): [number, number] => {
  const s = Math.min(1, long / Math.max(w, h));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
};

/** Of the steps between neighbors that change color, the share that are gentle (a gradient, a blur, noise) rather than a jump. */
function smoothShare(img: Img): number {
  let gentle = 0, all = 0;
  const step = Math.max(1, Math.floor((img.w * img.h) / 60000));
  for (let i = 0; i + 1 < img.data.length; i += step) {
    if ((i + 1) % img.w === 0) continue;
    const a = img.data[i], b = img.data[i + 1];
    if (a === b || (a & 255) < 128 || (b & 255) < 128) continue;
    all++;
    if (dE(a, b) < 0.04) gentle++;
  }
  return all ? gentle / all : 0;
}

/**
 * The ramps' hue shifting counted, a ramp each (a sky's many pixels are one material): lights turning
 * warmer and shadows cooler (what shades() does), the other way (a cold light: the moon, metal), or one
 * hue from dark to light (value only, what Saint11 calls dull and muddy). Null with fewer than two
 * colored ramps of three tones.
 */
export function hueShifting(ramps: Ramp[]): string | null {
  const ang = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  const tally = { warm: 0, cold: 0, flat: 0 };
  let n = 0;
  for (const r of ramps) {
    if (r.neutral || r.colors.length < 3) continue;
    const d = lch(r.colors[0]), l = lch(r.colors[r.colors.length - 1]), w = 1;
    // warmer: nearer yellow-orange (70°); a ramp of one hue moves under 8°
    const toward = ang(d.h, 70) - ang(l.h, 70);
    tally[ang(d.h, l.h) < 8 ? "flat" : toward > 0 ? "warm" : "cold"] += w;
    n++;
  }
  const all = tally.warm + tally.cold + tally.flat;
  if (n < 2 || !all) return null;
  const parts = [tally.warm ? `${tally.warm} warmer in the light and cooler in the shade (what shades() makes)` : "",
    tally.cold ? `${tally.cold} cooler in the light (a cold light: the moon, metal; shades() with a negative hue)` : "",
    tally.flat ? `${tally.flat} one hue from dark to light (value only: Saint11's dull and muddy)` : ""].filter(Boolean);
  return `Hue shifting, of ${all} colored ramps: ${parts.join(", ")}.`;
}

function shiftWords(r: Ramp): string {
  if (r.neutral || r.colors.length < 3) return "";
  const d = lch(r.colors[0]), l = lch(r.colors[r.colors.length - 1]);
  let dh = l.h - d.h;
  dh = ((dh + 540) % 360) - 180;
  if (Math.abs(dh) < 8) return "; one hue throughout";
  const toward = (h: number) => hueName(h).split(" ")[0];
  return `; hue shifts ${Math.round(Math.abs(dh))}° from ${toward(d.h)} in the shade to ${toward(l.h)} in the light${l.C < d.C * 0.75 ? ", paler in the light" : l.C > d.C * 1.3 ? ", richer in the light" : ""}`;
}

/** The ramps' readings of the light together, weighted by how many steps each read, leaving out the ones lighter straight downward (a sky toward its horizon); null when they don't agree. */
function overallLight(t: Techniques): [number, number] | null {
  let x = 0, y = 0, n = 0, len = 0;
  for (const l of t.light) {
    if (l.sure < 0.12 || (l.dir[1] > 0.6 * l.sure && Math.abs(l.dir[0]) < 0.5 * l.sure)) continue;
    x += l.dir[0] * l.n; y += l.dir[1] * l.n; n += l.n; len += l.sure * l.n;
  }
  if (!n || Math.hypot(x, y) < 0.6 * len) return null;
  const m = Math.hypot(x, y);
  return [x / m, y / m];
}

function lightLines(t: Techniques, ramps: Ramp[], pixelArt: boolean): string[] {
  const sure = t.light.filter((l) => l.sure > 0.12).slice(0, 4);
  if (!sure.length) return ["  Light: no side is lit more than another (flat, or lit from the front)."];
  const name = (r: Ramp) => (r.neutral ? "the greys" : `the ${hueName(lch(r.colors[Math.floor(r.colors.length / 2)]).h)}`);
  const words = sure.map((l) => `${name(ramps[l.ramp])} (ramp ${l.ramp + 1}) lighter toward ${way(l.dir)} (${l.sure.toFixed(2)})`);
  return [`  Light${pixelArt ? "" : " (in the translation)"}, read off where each ramp's lighter tones lie (1 = always): ${words.join("; ")}.${sure.some((l) => l.dir[1] > 0.5 * l.sure && Math.abs(l.dir[0]) < 0.3 * l.sure) ? " Lighter downward is often a sky toward its horizon." : ""}`];
}

/** How far apart two dithered tones sit: neighbors in a ramp blend; tones further apart, or of two ramps, make a harsh checker. */
function ditherGap(a: Color, b: Color, ramps: Ramp[]): string {
  const r = ramps.find((r) => r.colors.includes(a) && r.colors.includes(b));
  if (!r) return " (two ramps: harsh)";
  const k = Math.abs(r.colors.indexOf(a) - r.colors.indexOf(b));
  return k > 1 ? ` (${k} steps apart in a ramp: harsh; neighbors blend)` : "";
}

/** The color that fills nearly all of a picture's border (a flat backdrop), when it has no clear pixels. */
function flatBackdrop(img: Img): Color | null {
  if (img.data.some((c) => (c & 255) < 128)) return null;
  const n = new Map<Color, number>();
  let all = 0;
  for (let x = 0; x < img.w; x++) for (const y of [0, img.h - 1]) { n.set(img.data[y * img.w + x], (n.get(img.data[y * img.w + x]) ?? 0) + 1); all++; }
  for (let y = 1; y < img.h - 1; y++) for (const x of [0, img.w - 1]) { n.set(img.data[y * img.w + x], (n.get(img.data[y * img.w + x]) ?? 0) + 1); all++; }
  const top = [...n].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 0.8 * all ? top[0] : null;
}

function valueLines(img: Img, backdrop: Color | null = null): string[] {
  const L: number[] = [], out: string[] = [];
  let bx = 0, by = 0, bn = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const c = img.data[y * img.w + x]; if ((c & 255) >= 128) L.push(lab(c)[0]); }
  if (!L.length) return out;
  const sorted = L.slice().sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.98)], low = sorted[Math.floor(sorted.length * 0.02)];
  const mean = L.reduce((s, v) => s + v, 0) / L.length, sd = Math.sqrt(L.reduce((s, v) => s + (v - mean) ** 2, 0) / L.length);
  const dark = L.filter((v) => v < 0.4).length, light = L.filter((v) => v > 0.7).length;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const c = img.data[y * img.w + x]; if ((c & 255) >= 128 && lab(c)[0] >= top) { bx += x; by += y; bn++; } }
  out.push(`  Values: ${mean < 0.4 ? "low key (dark)" : mean > 0.65 ? "high key (light)" : "mid key"}, mean lightness ${mean.toFixed(2)}, contrast ${sd.toFixed(2)}; dark ${pct(dark, L.length)}, middle ${pct(L.length - dark - light, L.length)}, light ${pct(light, L.length)}. The brightest 2% gather around ${Math.round(bx / bn)},${Math.round(by / bn)} of ${img.w}x${img.h}. Range ${low.toFixed(2)} to ${top.toFixed(2)}${low > 0.2 && top < 0.85 ? ": neither end reached (pushing the darkest toward black and the lightest toward white frees the middle tones for the forms)" : low > 0.2 ? ": no near-black" : top < 0.85 ? ": no near-white" : ": from near-black to near-white"}.`);
  // the light's color against the shadows': the lightest fifth against the darkest
  const cs = [...img.data].filter((c) => (c & 255) >= 128 && c !== backdrop).map((c) => lab(c)).sort((p, q) => p[0] - q[0]);
  const fifth = Math.max(1, Math.floor(cs.length / 5)), m = (arr: number[][], i: number) => arr.reduce((s, v) => s + v[i], 0) / arr.length;
  const lo = cs.slice(0, fifth), hi = cs.slice(-fifth), warm = (m(hi, 2) - m(lo, 2)) + 0.5 * (m(hi, 1) - m(lo, 1));
  out.push(`  Temperature: the lights are ${warm > 0.02 ? "warmer (toward yellow and orange) than the shadows" : warm < -0.02 ? "cooler (toward blue) than the shadows" : "about as warm as the shadows"}.`);
  // contrast and color by band, top to bottom
  const bands = 6, con: string[] = [], chr: string[] = [];
  for (let b = 0; b < bands; b++) {
    const ls: number[] = [], ch: number[] = [];
    for (let y = Math.floor((b * img.h) / bands); y < Math.floor(((b + 1) * img.h) / bands); y++) for (let x = 0; x < img.w; x++) { const c = img.data[y * img.w + x]; if ((c & 255) >= 128) { const p = lab(c); ls.push(p[0]); ch.push(Math.hypot(p[1], p[2])); } }
    if (!ls.length) continue;
    const mu = ls.reduce((s, v) => s + v, 0) / ls.length;
    con.push(Math.sqrt(ls.reduce((s, v) => s + (v - mu) ** 2, 0) / ls.length).toFixed(2)); chr.push((ch.reduce((s, v) => s + v, 0) / ch.length).toFixed(2));
  }
  out.push(`  By band, top to bottom: contrast ${con.join(" ")}; color ${chr.join(" ")}${+con[0] < 0.6 * +con[con.length - 1] ? " (the far, upper part flatter: distance haze, or a sky)" : ""}.`);
  return out;
}

function perspectiveLines(segs: Segment[], vps: Vanish[], W: number, H: number, k: number, PW: number, foe: { x: number; y: number } | null): { lines: string[]; pxl: string | null; horizon: number | null } {
  if (segs.length < 3) return { lines: ["  Few straight edges: no perspective to read (organic shapes, or a flat side-on view)."], pxl: null, horizon: null };
  const total = segs.reduce((s, q) => s + q.len, 0), out = [`  ${segs.length} straight edges${k !== 1 ? ` (read at ${W}x${H}; places below in the ${PW}-wide picture)` : ""}.`];
  let pxl: string | null = null, horizon: number | null = null;
  // a third point: uprights that fan out (not a degree or two off parallel) and meet within a few heights
  // and on the column the camera looks along (a tilted camera's uprights meet straight above or below it)
  const third = (v: Vanish) => !v.far && Math.abs(v.dir[1]) > 0.9 && v.lines.length >= 5 && v.fan >= 3 && Math.abs(v.y - H / 2) < 4 * H && (v.y < -0.1 * H || v.y > 1.1 * H) && Math.abs(v.x - W / 2) < 0.25 * W;
  const finite = vps.filter((v) => !v.far), near = finite.filter((v) => Math.abs(v.x - W / 2) < 1.5 * W && v.y > -H && v.y < 2 * H);
  for (const v of vps) {
    const share = pct(v.lines.reduce((s, q) => s + q.len, 0), total);
    const verticalish = Math.abs(v.dir[1]) > 0.9;
    if (v.far) out.push(`  - ${v.lines.length} lines parallel in the picture (${share} of their length), ${verticalish ? "upright: uprights stay upright (no third point)" : Math.abs(v.dir[0]) > 0.9 ? "level: lines across stay level" : `at ${Math.round((Math.atan2(v.dir[1], v.dir[0]) * 180) / Math.PI)}°: an oblique set (isometric or a side view)`}.`);
    else out.push(`  - ${v.lines.length} lines meet at ${Math.round(v.x * k)},${Math.round(v.y * k)} (${share} of their length)${verticalish ? (third(v) ? `: uprights converge ${v.y < H / 2 ? "above" : "below"} (three-point, the camera tilted ${v.y < H / 2 ? "up" : "down"})` : ": uprights nearly parallel (no third point to speak of)") : ""}.`);
  }
  const level = finite.filter((v) => Math.abs(v.dir[1]) <= 0.9), cx = W / 2, cy = H / 2;
  // two-point: two level points on one horizon, either side of the middle, square to each other through a believable lens
  let two: [Vanish, Vanish, number] | null = null;
  for (let i = 0; i < level.length && !two; i++) for (let j = i + 1; j < level.length; j++) {
    const a = level[i], b = level[j], f2 = -((a.x - cx) * (b.x - cx) + (a.y - cy) * (b.y - cy));
    const fov = f2 > 0 ? (2 * Math.atan(W / 2 / Math.sqrt(f2)) * 180) / Math.PI : 180;
    const share2 = (a.weight + b.weight) / total;
    if (Math.abs(a.y - b.y) < 0.12 * H && (a.x - cx) * (b.x - cx) < 0 && fov >= 35 && fov <= 120 && a.lines.length >= 4 && b.lines.length >= 4 && share2 >= 0.25) { two = a.x < b.x ? [a, b, Math.sqrt(f2)] : [b, a, Math.sqrt(f2)]; break; }
  }
  // one-point: the level point inside the picture's reach the motion opens out from, else the one most lines meet at
  const fanOf = (v: Vanish) => { const as = v.lines.map((q) => q.a); let best = 0; for (const a of as) for (const b of as) { const d = Math.abs(a - b) % 180; best = Math.max(best, Math.min(d, 180 - d)); } return best; };
  const inside = near.filter((v) => Math.abs(v.dir[1]) <= 0.9 && fanOf(v) >= 15 && v.lines.reduce((s, q) => s + q.len, 0) >= 0.15 * total);
  const byFoe = foe ? inside.filter((v) => Math.hypot(v.x - foe.x, v.y - foe.y) < 0.2 * W).sort((a, b) => Math.hypot(a.x - foe.x, a.y - foe.y) - Math.hypot(b.x - foe.x, b.y - foe.y))[0] : undefined;
  // three points: uprights meeting above or below, with the horizon of the level points: the lens from
  // the two (square to each other through the middle), and the tilt from where the horizon is
  const up = vps.find(third), cx2 = W / 2, cy2 = H / 2;
  const level0 = two ? (two[0].y + two[1].y) / 2 : (byFoe ?? inside[0] ?? level.slice().sort((a, b) => b.weight - a.weight)[0])?.y;
  const f3 = up && level0 !== undefined ? -(up.y - cy2) * (level0 - cy2) : -1;
  // uprights that meet (strictly tested above) outweigh a pair of level points that disagree with them
  if (up && level0 !== undefined && f3 > 0 && Math.sign(up.y - cy2) !== Math.sign(level0 - cy2)) {
    const f = Math.sqrt(f3), pitch = (Math.atan((level0 - cy2) / f) * 180) / Math.PI;
    horizon = level0;
    out.push(`  Three-point perspective: uprights meet at ${Math.round(up.x * k)},${Math.round(up.y * k)}, the horizon at row ${Math.round(level0 * k)}: a lens of ~${Math.round(f * k)} px (fov ~${Math.round((2 * Math.atan(W / 2 / f) * 180) / Math.PI)}°), the camera tilted ${pitch > 0 ? "up" : "down"} ~${Math.round(Math.abs(pitch))}°.`);
    pxl = `perspective({ w: ${PW}, horizon: ${Math.round(level0 * k)}, eye: <m>, focal: ${Math.round(f * k)}, pitch: ${Math.round(pitch)} }): vertical() should land near ${Math.round(up.x * k)},${Math.round(up.y * k)}.`;
  } else if (two) {
    const [a, b, f] = two, hy = (a.y + b.y) / 2;
    horizon = hy;
    out.push(`  Two-point perspective: the horizon at row ${Math.round(hy * k)}; if the two sets are square to each other, a focal length of ~${Math.round(f * k)} px (fov ~${Math.round((2 * Math.atan(W / 2 / f) * 180) / Math.PI)}°).`);
    const yaw = Math.round((Math.atan((W / 2 - a.x) / f) * 180) / Math.PI);
    pxl = `perspective({ w: ${PW}, horizon: ${Math.round(hy * k)}, eye: <m>, focal: ${Math.round(f * k)}, yaw: ${yaw} }): vanish(0) and vanish(90) then land near ${Math.round(a.x * k)} and ${Math.round(b.x * k)}.`;
  } else if (byFoe || inside.length) {
    const v = byFoe ?? inside.sort((a, b) => b.weight - a.weight)[0];
    horizon = v.y;
    out.push(`  One-point perspective: the horizon at row ${Math.round(v.y * k)}, the camera looking at column ${Math.round(v.x * k)}${byFoe ? " (where the motion opens out from too)" : ""}.${inside.length > 1 ? " The other points are other things' own (a box turned another way, an interior's lines)." : ""}`);
    pxl = `perspective({ w: ${PW}, horizon: ${Math.round(v.y * k)}, vp: ${Math.round(v.x * k)}, eye: <m>, fov: <deg> }): the eye's height and the lens aren't in the picture: choose them by how big things there are.`;
  } else if (!finite.length) out.push("  No lines meet: a flat, side-on or orthographic view.");
  return { lines: out, pxl, horizon };
}

/**
 * What moves in a region asked for (--at), read as the tutorials' readers measured it by hand: each
 * frame, the box of its pixels, then its spacing and squash. One thing moving in the region reads best.
 */
export function regionLines(frames: Img[], origin: [number, number] = [0, 0]): string[] {
  const W = frames[0].w, H = frames[0].h, n = frames.length;
  // the mover: colors rare in the region over the clip (the ground's are common), on pixels that don't
  // keep one color all through (a still detail does): where it rests counts, where it left doesn't
  const count = new Map<Color, number>();
  for (const f of frames) for (const c of f.data) if ((c & 255) >= 128) count.set(c, (count.get(c) ?? 0) + 1);
  const rare = (c: Color) => (c & 255) >= 128 && (count.get(c) ?? 0) < 0.12 * W * H * n;
  const still = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) still[i] = frames.every((f) => f.data[i] === frames[0].data[i]) ? 1 : 0;
  const track: [number, number, number, number, number][] = [], area: number[] = [], light: number[] = [];
  for (let t = 0; t < n; t++) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1, k = 0, l = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = frames[t].data[y * W + x];
      if (still[y * W + x] || !rare(c)) continue;
      k++; l += lab(c)[0]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    area.push(k); light.push(k ? l / k : 0);
    if (k >= 2) track.push([t, x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
  }
  if (track.length < 2) return ["  Nothing in it differs from its usual look on more than one frame."];
  // (where they are in the whole picture, as --at and shot give places)
  const boxes = track.slice(0, 24).map(([t, x, y, w, h]) => `${t}: ${x + origin[0]},${y + origin[1]} ${w}x${h}`).join("; ");
  const sp = spacingWords(track);
  // an effect played once: it shows, flashes near-white early, then shrinks and is gone (Saint11's
  // explosion: dark, white, blast, fade)
  const shown = area.map((a, t) => [t, a] as const).filter(([, a]) => a >= 2), born = shown[0]?.[0] ?? 0, last = shown[shown.length - 1]?.[0] ?? 0;
  const peak = area.indexOf(Math.max(...area)), flash = light.findIndex((l, t) => t >= born && t <= born + 3 && l > 0.85);
  const once = shown.length >= 3 && flash >= 0 && last < n - 1 && area[last] < 0.5 * area[peak];
  const fx = once ? [`  Played once, an effect: it shows at frame ${born}, flashes near-white at ${flash}, is biggest at ${peak}, and fades over ${last - peak} frames to nothing by ${last + 1}, then ${n - 1 - last} empty. Its area, px: ${area.slice(born, last + 2).join(" ")}; its lightness: ${light.slice(born, last + 1).map((l) => l.toFixed(2)).join(" ")}.`] : [];
  return [...fx, `  Its box (the colors rare in the region, where they come and go), frame: x,y wxh: ${boxes}${track.length > 24 ? "; ..." : ""}.`, ...(sp ? [`  ${sp}.`] : []),
    `  In ${track.length} of ${n} frames${track.length < n ? ` (absent in ${n - track.length})` : ""}; a smear or an effect in the region adds to the box, and a mover in the ground's own colors is missed.`];
}

function motionOf(frames: Img[], ms: number[], smeared = false) {
  const lines: string[] = [], pxl: string[] = [];
  const W = frames[0].w, H = frames[0].h, L = frames.map(lumaOf), n = frames.length;
  const fps = 1000 / (ms.reduce((s, v) => s + v, 0) / ms.length);
  const consec = L.slice(1).map((l, i) => frameDiff(L[i], l)), held = consec.filter((d) => d === 0).length;
  // a usual step: of the frames that change (a clip on twos repeats every other frame: no step at all)
  const changing = consec.filter((d) => d > 0).sort((a, b) => a - b), med = changing[changing.length >> 1] || 0;
  const delays = [...new Set(ms)];
  // each drawing and how long it shows: the frames it repeats over, their times added
  const held_ms: number[] = [];
  for (let i = 0; i < n; i++) if (i && consec[i - 1] === 0) held_ms[held_ms.length - 1] += ms[i]; else held_ms.push(ms[i]);
  const on = held_ms.length > 1 && delays.length === 1 && held_ms.every((t) => t === held_ms[0]) ? held_ms[0] / delays[0] : 1;
  const drawn = held_ms.length === n ? "" : on > 1 ? `; ${held_ms.length} drawings held ${held_ms[0]} ms each (on ${["", "", "twos", "threes", "fours"][on] ?? `${on}s`})`
    : `; ${held_ms.length} drawings held ${held_ms.slice(0, 16).join(", ")}${held_ms.length > 16 ? ", ..." : ""} ms`;
  lines.push(`  Timing: ${n} frames, ${delays.length === 1 ? `${delays[0]} ms each (${fps.toFixed(fps < 10 ? 1 : 0)} fps)` : `${Math.min(...delays)}-${Math.max(...delays)} ms (held poses differ)`}; ${held} repeat the frame before (holds)${drawn}.`);
  // (as much change as a usual step, and no farther across: a ball that crossed and is back at its
  // start changes as much as one stride, but over the whole way it went)
  const span = (a: Float32Array, b: Float32Array) => {
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(a[y * W + x] - b[y * W + x]) > 0.02) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return x1 < 0 ? 0 : Math.max(x1 - x0, y1 - y0) + 1;
  };
  const spans = L.slice(1).map((l, i) => span(L[i], l)).filter((v) => v > 0).sort((a, b) => a - b), wide = spans[Math.floor(spans.length * 0.9)] ?? 0;
  // (nor back against the way it went: what differs from the clip's commonest frame going one way every
  // step, then back over more than any step at the seam, a dash whose smears make every step as wide)
  const S = Array.from({ length: Math.min(n, 16) }, (_, i) => Math.floor((i * n) / Math.min(n, 16))), usual = new Float32Array(W * H), col = new Float32Array(S.length);
  for (let p = 0; p < W * H; p++) { S.forEach((t, i) => (col[i] = L[t][p])); col.sort(); usual[p] = col[col.length >> 1]; }
  const mids = L.map((l) => { let sx = 0, sy = 0, c = 0; for (let p = 0; p < W * H; p++) if (Math.abs(l[p] - usual[p]) > 0.02) { sx += p % W; sy += Math.floor(p / W); c++; } return c ? [sx / c, sy / c] : null; });
  const step = (a: number[] | null, b: number[] | null) => (a && b ? [b[0] - a[0], b[1] - a[1]] : null);
  const steps = mids.slice(1).map((m, i) => step(mids[i], m)), way = steps.reduce<number[]>((s, d) => (d ? [s[0] + d[0], s[1] + d[1]] : s), [0, 0]), wl = Math.hypot(way[0], way[1]) || 1;
  const along = (d: number[]) => (d[0] * way[0] + d[1] * way[1]) / wl, back = step(mids[n - 1], mids[0]);
  const oneWay = n >= 3 && steps.every((d) => d && along(d) >= -1) && !!back && along(back) < -Math.max(...steps.map((d) => Math.abs(along(d!))), 4);
  const seam = frameDiff(L[n - 1], L[0]), much = seam <= Math.max(2 * med, 0.002), far = span(L[n - 1], L[0]), near = far <= Math.max(8, 1.5 * wide), loops = much && near && !oneWay;
  lines.push(`  Loop: ${loops ? "the last frame runs into the first (a loop that closes)" : `the last frame jumps to the first (${!much ? `${(seam / (med || 1e-9)).toFixed(1)}x a usual step` : !near ? `across ${far} px, where a usual step spans ${wide}` : `back ${Math.round(-along(back!))} px against the way every step went`}): not a closed loop, or a clip from a longer one`}.`);
  // a cycle: the shortest shift after which frames repeat
  let cycle = 0;
  for (let p = 2; p <= Math.min(Math.floor(n / 2), 120) && med > 0; p++) {
    let s = 0, c = 0;
    for (let i = 0; i + p < n && c < 40; i += Math.max(1, Math.floor((n - p) / 40))) { s += frameDiff(L[i], L[i + p]); c++; }
    if (c && s / c < 0.35 * med) { cycle = p; break; }
  }
  if (cycle) { lines.push(`  Cycle: the frames repeat every ${cycle} (${((cycle * 1000) / fps / 1000).toFixed(2)} s)${n >= 2 * cycle ? `, ${(n / cycle).toFixed(1)} times in the clip` : ""}.`); pxl.push(`anim(name, { frames: ${cycle}, fps: ${Math.round(fps)} }) for the cycle.`); }
  else lines.push("  Cycle: no shorter cycle repeats within the clip.");
  // the flow between a few pairs of frames spread over the clip
  const pairs = Array.from({ length: Math.min(10, n - 1) }, (_, i) => Math.floor((i * (n - 1)) / Math.min(10, n - 1)));
  const flows: Flow[] = [], each: Flow[][] = [];
  const r = Math.min(12, Math.floor(Math.min(W, H) / 6));
  for (const i of pairs) if (consec[i] > 0) { const f = blockFlow(L[i], L[i + 1], W, H, 8, r); each.push(f); flows.push(...f); }
  const moving = flows.filter((f) => f.dx || f.dy), still = flows.length - moving.length;
  const foe = focusOfExpansion(flows);
  lines.push(`  Flow: ${flows.length} textured blocks matched over ${pairs.length} pairs of frames: ${pct(still, flows.length)} stand still, ${pct(moving.length, flows.length)} move.`);
  let bands: { y0: number; y1: number; v: number }[] = [];
  // a camera moving forward moves much of the picture straight out from one point, on both sides of it
  // and across the picture: a pan carries everything one way (a point far off to one side fits it
  // too), and things moving on a still picture keep to their places
  let forward = !!foe && foe.n >= 25 && foe.agree >= 0.4 && moving.length >= 0.15 * flows.length;
  if (forward && foe) {
    const F = foe;
    const ins = moving.filter((f) => { const rx = f.x - F.x, ry = f.y - F.y, c = (rx * f.dx + ry * f.dy) / (Math.hypot(rx, ry) * Math.hypot(f.dx, f.dy) || 1); return F.out ? c > 0.9 : c < -0.9; });
    const left = ins.filter((f) => f.x < F.x).length, xs = ins.map((f) => f.x);
    forward = Math.min(left, ins.length - left) >= 0.2 * ins.length && Math.max(...xs) - Math.min(...xs) >= 0.5 * W;
    // and the same way frame after frame: a runner in place spreads its limbs out and draws them in by
    // turns, a camera going forward opens out every frame
    const said = each.map((f) => focusOfExpansion(f)).filter((e) => e !== null);
    if (said.length >= 2) forward &&= said.filter((e) => e!.out === F.out && Math.hypot(e!.x - F.x, e!.y - F.y) <= 0.25 * W).length >= 0.6 * said.length;
  }
  if (forward && foe) {
    lines.push(`  Camera: the scene ${foe.out ? "opens out from" : "closes in to"} ${Math.round(foe.x)},${Math.round(foe.y)} (${pct(foe.agree * 100, 100)} of the moving blocks agree): ${foe.out ? "moving forward toward that point, the vanishing point of the motion" : "moving backward from it"}; things near it move least, things at the edges most.`);
    pxl.push(`perspective({ ..., vp: ${Math.round(foe.x)}, horizon: ${Math.round(foe.y)} }) and a ground that goes by along z: plane() reading the distance travelled.`);
  }
  // planes going by: bands of rows carried across together, measured between neighbors and then four
  // frames apart near four times that (a fraction of a pixel a frame, and no mistaking a repeat for it)
  const k = Math.max(1, Math.min(8, Math.floor(n / 4))), per = new Map<number, number[]>(), fit = new Map<number, number[]>();
  for (const i of pairs) {
    if (i + k >= n) continue;
    const one = bandShifts(L[i], L[i + 1], W, H, 8, -16, 16);
    for (const b of one) {
      if (b.gain < 0.3 && b.dx) continue;
      const far = k > 1 ? bandShifts(L[i], L[i + k], W, H, 8, b.dx * k - k - 2, b.dx * k + k + 2).find((q) => q.y === b.y) : b;
      if (!far) continue;
      (per.get(b.y) ?? per.set(b.y, []).get(b.y)!).push(far.dx / k);
      (fit.get(b.y) ?? fit.set(b.y, []).get(b.y)!).push(Math.min(b.gain, far.gain));
    }
  }
  const median = (v: number[]) => { const q = v.slice().sort((a, b) => a - b); return q[q.length >> 1]; };
  for (const y of [...per.keys()].sort((a, b) => a - b)) {
    const v = median(per.get(y)!), g = median(fit.get(y)!);
    if (per.get(y)!.length < Math.max(2, pairs.length / 2) || (v && g < 0.3)) continue;
    const last = bands[bands.length - 1];
    if (last && last.y1 === y && Math.abs(last.v - v) <= Math.max(0.3, Math.abs(v) * 0.15)) { last.v = (last.v * (last.y1 - last.y0) + v * 8) / (last.y1 - last.y0 + 8); last.y1 = y + 8; }
    else bands.push({ y0: y, y1: y + 8, v });
  }
  // and the band goes by all across, each frame: a ball crossing a flat ground moves its rows too, but a
  // small part of their width at a time
  const across = (b: { y0: number; y1: number }) => median(pairs.filter((i) => i + 1 < n).map((i) => {
    let c = 0;
    for (let x = 0; x < W; x++) for (let y = b.y0; y < Math.min(H, b.y1); y++) if (Math.abs(L[i][y * W + x] - L[i + 1][y * W + x]) > 0.02) { c++; break; }
    return c / W;
  }));
  // and its texture goes with it: the edges in its rows meet again where the band's step puts them, more
  // than where they were (a thing going by with a smear over a dotted floor moves as much of the rows,
  // but the dots stay)
  const carries = (b: { y0: number; y1: number; v: number }) => median(pairs.filter((i) => i + k < n).map((i) => {
    const s = Math.round(b.v * k);
    let at0 = 0, atS = 0;
    for (let y = b.y0; y < Math.min(H, b.y1); y++) for (let x = Math.max(0, -s); x < Math.min(W - 1, W - s); x++) {
      const p = y * W + x;
      if (Math.abs(L[i][p] - L[i][p + 1]) <= 0.02) continue;
      if (Math.abs(L[i][p] - L[i + k][p]) <= 0.02) at0++;
      if (Math.abs(L[i][p] - L[i + k][p + s]) <= 0.02) atS++;
    }
    return atS - at0;
  })) > 0;
  bands = bands.filter((b) => Math.abs(b.v) >= 0.1 && across(b) >= 0.4 && carries(b));
  if (bands.length) {
    const sorted = bands.slice().sort((a, b) => Math.abs(a.v) - Math.abs(b.v));
    lines.push(`  Planes going by (bands of rows carried across together): ${bands.map((b) => `rows ${b.y0}-${b.y1} at ${Math.abs(b.v).toFixed(2)} px/frame ${b.v < 0 ? "left" : "right"} (${(Math.abs(b.v) * fps).toFixed(0)} px/s)`).join("; ")}.${bands.length > 1 ? ` Parallax: ${sorted.length} speeds from ${Math.abs(sorted[0].v).toFixed(2)} to ${Math.abs(sorted[sorted.length - 1].v).toFixed(2)} px/frame, each its own plane, the faster the nearer.` : ""}`);
    pxl.push(`scroll(name, y, per) for each plane, per = its speed x the loop's frames (here ${bands.map((b) => Math.round(Math.abs(b.v) * n)).join(", ")} px over ${n} frames), a whole number of each strip's widths.`);
  }
  // the pieces: what moves how on what stays (not when the whole view moves toward its point)
  // subpixel motion: in the tutorial it took 26% of what changes, examples/subpixel 15%, pxl's lit
  // scenes under 2%
  const sub = subpixel(frames), subClip = sub.share >= 0.1 && sub.share * sub.changed >= 12;
  const layers = forward ? null : decompose(frames, bands, smeared ? 0.08 : 0.05, flows, subClip);
  if (subClip) {
    const tones = sub.tones.filter((t, k) => sub.tones.findIndex((u) => u.mid === t.mid) === k).slice(0, 4);
    lines.push(`  Subpixel: ${pct(sub.share * 100, 100)} of what changes from frame to frame is a pixel going between a color and the in-between tone of it and its neighbor: edges moving by part of a pixel. A part goes half a pixel when its edge takes that tone (the outline it pushes into lightening, the fill behind darkening; or a tone past its edge), then the next whole pixel. The tones it takes: ${tones.map((t) => `${hex(t.mid)} between ${hex(t.a)} and ${hex(t.b)}`).join("; ")}.`);
    pxl.push(`Subpixel: stamp(part, x, y + 0.5, { sub: [dx, dy] }) (or c.subpixel for what's drawn in code) puts a part half a pixel along the way [dx, dy]: it stays where it comes from and pushes into its own outline, in its ramp's tone between outline and fill, so the ramps need those steps (here ${tones.map((t) => hex(t.mid)).join(", ")}); parts by turns, each a frame behind the one it hangs from (examples/subpixel.px.js).`);
  } else if (moving.length && moving.every((f) => Number.isInteger(f.dx) && Number.isInteger(f.dy))) lines.push("  Steps are whole pixels at 1x (as measured: block matching moves whole pixels).");
  return { lines, pxl, flows, foe, forward, bands, frames, W, H, layers };
}

// Did the picture move a whole pixel at (x, y) from a to b: what's here now was a step back, and what
// was here is now a step on?
export function shifted(a: Img, b: Img, x: number, y: number): boolean {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const px = x - dx, py = y - dy, nx = x + dx, ny = y + dy;
    if (px < 0 || py < 0 || nx < 0 || ny < 0 || px >= a.w || nx >= a.w || py >= a.h || ny >= a.h) continue;
    if (b.get(x, y) === a.get(px, py) && b.get(nx, ny) === a.get(x, y)) return true;
  }
  return false;
}

// Subpixel motion: in-between tones coming and going. Of the pixels that change between neighboring
// frames, the share that goes between a color and a tone lying between it and a neighbor of another
// color across it (an edge's cover changing, not the edge moving a whole pixel).
function subpixel(frames: Img[]): { share: number; changed: number; tones: { mid: Color; a: Color; b: Color; n: number }[] } {
  const W = frames[0].w, H = frames[0].h, clear = (c: Color) => (c & 255) < 128;
  const ends = (f: Img, x: number, y: number): [Color, Color] | null => {
    const c = f.get(x, y);
    if (clear(c)) return null;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x < dx || y < dy || x + dx >= W || y + dy >= H) continue;
      const p = f.get(x - dx, y - dy), q = f.get(x + dx, y + dy);
      if (clear(p) || clear(q) || p === q || p === c || q === c) continue;
      const A = lab(p), B = lab(q), P = lab(c), ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (n2 < 0.15 ** 2) continue;
      const t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1] + (P[2] - A[2]) * ab[2]) / n2;
      if (t > 0.2 && t < 0.8 && Math.hypot(P[0] - A[0] - t * ab[0], P[1] - A[1] - t * ab[1], P[2] - A[2] - t * ab[2]) < 0.3 * Math.sqrt(n2)) return [p, q];
    }
    return null;
  };
  // or a pixel gone part of the way from its color toward a neighbor's, one of the two dark (an outline
  // a part pushes into, lightening toward the fill; the fill darkening toward the outline it leaves):
  // [from, that neighbor]
  // (it alone: the neighbor it goes toward and the one across stay as they were, where a light
  // changes a patch together)
  const toward = (f: Img, g: Img, x: number, y: number, from: Color): [Color, Color] | null => {
    const c = f.get(x, y);
    if (clear(c) || clear(from)) return null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (x - dx < 0 || y - dy < 0 || x + dx < 0 || y + dy < 0 || x + dx >= W || y + dy >= H || x - dx >= W || y - dy >= H) continue;
      const q = f.get(x + dx, y + dy);
      if (clear(q) || q === c || q === from || g.get(x + dx, y + dy) !== q || g.get(x - dx, y - dy) !== f.get(x - dx, y - dy)) continue;
      // one of the two an outline (dark): a light flickering moves tones toward their neighbors too
      if (Math.min(lab(from)[0], lab(q)[0]) > 0.3) continue;
      const A = lab(from), B = lab(q), P = lab(c), ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (n2 < 0.15 ** 2) continue;
      const t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1] + (P[2] - A[2]) * ab[2]) / n2;
      if (t > 0.2 && t < 0.8 && Math.hypot(P[0] - A[0] - t * ab[0], P[1] - A[1] - t * ab[1], P[2] - A[2] - t * ab[2]) < 0.3 * Math.sqrt(n2)) return [from, q];
    }
    return null;
  };
  let changed = 0, partial = 0;
  const tones = new Map<string, { mid: Color; a: Color; b: Color; n: number }>();
  const note = (mid: Color, [a, b]: [Color, Color]) => { const k = `${mid},${Math.min(a, b)},${Math.max(a, b)}`, t = tones.get(k); if (t) t.n++; else tones.set(k, { mid, a, b, n: 1 }); };
  for (let i = 0; i + 1 < frames.length; i++) {
    const a = frames[i], b = frames[i + 1];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ca = a.get(x, y), cb = b.get(x, y);
      if (ca === cb) continue;
      changed++;
      // (not where the picture moved a whole pixel round it: a ramp's middle tone carried along)
      const ea = ends(a, x, y), eb = ends(b, x, y), whole = shifted(a, b, x, y);
      if (whole) continue;
      if (eb && (ca === eb[0] || ca === eb[1])) { partial++; note(cb, eb); continue; }
      if (ea && (cb === ea[0] || cb === ea[1])) { partial++; note(ca, ea); continue; }
      const tb = toward(b, a, x, y, ca), ta = tb ? null : toward(a, b, x, y, cb);
      if (tb) { partial++; note(cb, tb); } else if (ta) { partial++; note(ca, ta); }
    }
  }
  return { share: changed ? partial / changed : 0, changed, tones: [...tones.values()].sort((p, q) => q.n - p.n) };
}

// What a palette lessons warn of (Pixel Joint's critiques, Saint11): colors so near they read as one
// (on a lossless picture, where they are the artist's, not noise: study folds them for the rest of its
// reading, and says which), and ramps whose steps are too close to read as steps.
function paletteSanity(drawn: Img | null, ramps: Ramp[], folded: number): string[] {
  const out: string[] = [];
  // (colors that differ in their alpha only are one; and a flood of near tones is a lossy copy's noise,
  // not choices: only when folding took a few away)
  const cols = drawn ? [...new Map([...colorCounts(drawn).keys()].map((c) => [hex(c), c])).values()] : [];
  if (drawn && cols.length <= folded * 1.5 + 4) {
    const twins: [Color, Color][] = [];
    for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) if (dE(cols[i], cols[j]) < 0.03) twins.push([cols[i], cols[j]]);
    if (twins.length) out.push(`  Near twins: ${twins.length} pair${twins.length > 1 ? "s" : ""} of colors too close to tell apart (under 0.03 in OKLab), read as one here: ${twins.slice(0, 5).map(([a, b]) => `${hex(a)}/${hex(b)}`).join(", ")}${twins.length > 5 ? " ..." : ""}. Merge each pair, or spread it if both are meant: every tone you keep should earn its place.`);
  }
  // (the whole difference, hue and saturation too: two tones of a lightness but hues apart read apart)
  const tight = ramps.filter((r) => r.colors.length > 1).map((r, i) => {
    let at = -1, step = Infinity;
    for (let k = 1; k < r.colors.length; k++) { const d = dE(r.colors[k], r.colors[k - 1]); if (d < step) { step = d; at = k; } }
    return { i, at, step, r };
  }).filter((t) => t.step < 0.045);
  // a tone far more saturated than its ramp neighbors glares (eyeburn)
  const burn = ramps.filter((r) => r.colors.length >= 3).flatMap((r) => r.colors.slice(1, -1).map((c, i) => ({ c, C: lch(c).C, a: lch(r.colors[i]).C, b: lch(r.colors[i + 2]).C }))).filter((t) => t.C > 0.15 && t.C > 1.6 * Math.max(t.a, t.b));
  if (burn.length) out.push(`  Eyeburn: ${burn.slice(0, 3).map((t) => `${hex(t.c)} (chroma ${t.C.toFixed(2)} between ${t.a.toFixed(2)} and ${t.b.toFixed(2)})`).join(", ")}: far more saturated than its ramp neighbors, it glares; pull it toward them.`);
  if (tight.length) out.push(`  Steps too close: ${tight.slice(0, 4).map((t) => `ramp ${t.i + 1}'s ${hex(t.r.colors[t.at - 1])} to ${hex(t.r.colors[t.at])} (${t.step.toFixed(3)} apart in OKLab)`).join(", ")}${tight.length > 4 ? " ..." : ""}: neighbors in a ramp read as steps from about 0.05 apart (pxl's shades() spaces its own by about 0.1); merge them or spread the ramp.`);
  return out;
}

const WHAT: Record<Piece["kind"], string> = {
  carried: "one drawing carried along a path: a sprite stamped where the path puts it each frame",
  walk: "changing drawings carried along a path (a walk, a run, a cloud drifting and changing shape): an anim of its drawings (a cycle when it has one), stamped along its path",
  stream: "things going across one after another (traffic, a crowd): each a sprite stamped along its lane, back at the start when it leaves (a whole lane at one speed: scroll())",
  anim: "animated in place: an anim of its drawings",
  rig: "parts moving against a body that stays: a rig (rig(), its parts at sockets), or an anim with a frame per pose",
  action: "a run of poses played once (an attack, a jump, a fall): an anim with a frame per pose (for many, a rig posed by ik: rig/knight.px.js), its timing in how many frames each part takes",
  effect: "changing all over without repeating, or paint that comes and goes (fire, water, smoke, sparkle, a flash, a smear): an effect in code (flame(), plume(), warp(), noise drawn per frame), or an anim of its drawings played once (a smear: stamp's smear, arc())",
  light: "lighter and darker all at once: a light: glow(), a lamp, or colors swapped per frame",
};
/** Frame numbers as runs: 3-5, 8, 15-18. */
const spans = (v: number[]) => { const out: string[] = []; for (let i = 0; i < v.length; ) { let j = i; while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++; out.push(j > i ? `${v[i]}-${v[j]}` : `${v[i]}`); i = j + 1; } return out.join(", "); };
/** The pieces told and drawn: the 16 biggest things, then the 8 biggest lights. */
const shown = (pieces: Piece[]) => [...pieces.filter((p) => p.kind !== "light").slice(0, 16), ...pieces.filter((p) => p.kind === "light").slice(0, 8)];
/**
 * How a piece moves frame to frame (Saint11: the spacing between drawings is the speed): its steps along
 * the way it travels most, each run of them speeding up, slowing or even, holds, a move back first
 * (anticipation), past its rest and back (overshoot); and its box squashing and stretching.
 */
export function spacingWords(track: [number, number, number, number, number][], squashOnly = false): string | null {
  if (track.length < 4) return null;
  const c = track.map(([, x, y, w, h]) => [x + w / 2, y + h / 2]), out: string[] = [];
  const range = (k: number) => Math.max(...c.map((p) => p[k])) - Math.min(...c.map((p) => p[k]));
  const ax = range(0) >= range(1) ? 0 : 1;
  if (!squashOnly && range(ax) >= 3) {
    const d = c.slice(1).map((p, i) => Math.round(p[ax] - c[i][ax]));
    if (Math.max(...d.map(Math.abs)) <= 1) return null;
    // runs of steps one way (a hold, 0, is a run of its own)
    const runs: number[][] = [];
    for (const v of d) { const r = runs[runs.length - 1]; if (r && Math.sign(r[0]) === Math.sign(v)) r.push(v); else runs.push([v]); }
    const word = (r: number[]) => {
      if (!r[0]) return `holds ${r.length}`;
      const m = r.map(Math.abs), way = ax ? (r[0] < 0 ? "up" : "down") : r[0] < 0 ? "left" : "right";
      const up = m.every((v, i) => !i || v >= m[i - 1]), down = m.every((v, i) => !i || v <= m[i - 1]);
      const how = m.length < 2 ? "" : up && down ? ", even" : up ? ", speeding up" : down ? ", slowing" : m.indexOf(Math.max(...m)) > 0 && m.lastIndexOf(Math.max(...m)) < m.length - 1 ? ", easing in and out" : ", uneven";
      return `${way} ${m.join(" ")}${how}`;
    };
    const moving = runs.filter((r) => r[0]), travel = (r: number[]) => Math.abs(r.reduce((s, v) => s + v, 0));
    const notes: string[] = [];
    if (moving.length >= 2 && travel(moving[0]) * 3 <= travel(moving[1]) && Math.sign(moving[0][0]) !== Math.sign(moving[1][0])) notes.push("a move back first (anticipation)");
    const n = moving.length;
    if (n >= 2 && travel(moving[n - 1]) * 3 <= travel(moving[n - 2]) && Math.sign(moving[n - 1][0]) !== Math.sign(moving[n - 2][0])) notes.push("past its rest and back (overshoot)");
    out.push(`spacing, px a frame: ${runs.slice(0, 8).map(word).join("; ")}${runs.length > 8 ? "; ..." : ""}${notes.length ? `: ${notes.join(", ")}` : ""}`);
  }
  // squash and stretch: wider as it gets shorter, about the same area
  const W = track.map((t) => t[3]), H = track.map((t) => t[4]), A = track.map((t) => t[3] * t[4]);
  const spread = (v: number[]) => Math.max(...v) / Math.max(1, Math.min(...v));
  const mw = W.reduce((s, v) => s + v, 0) / W.length, mh = H.reduce((s, v) => s + v, 0) / H.length;
  const cov = W.reduce((s, w, i) => s + (w - mw) * (H[i] - mh), 0);
  // (the area kept, as a squash keeps it: a box that grows and shrinks is a limb reaching out)
  if (spread(W) >= 1.15 && spread(H) >= 1.15 && cov < 0 && spread(A) <= 1.35) out.push(`squash and stretch: ${Math.min(...W)}-${Math.max(...W)} wide as ${Math.max(...H)}-${Math.min(...H)} tall, the area within ${Math.round((spread(A) - 1) * 100)}%`);
  return out.length ? out.join("; ") : null;
}

/**
 * A cycle's halves (Saint11's top-down walk: the second half is the first flipped, so draw half) and
 * its bob: the top of its box frame by frame over one cycle.
 */
function cycleWords(p: Piece): string | null {
  const c = p.cycle, out: string[] = [];
  if (!c || c < 4 || c > 24) return null;
  if (c % 2 === 0 && p.stripFrames === c) {
    const W = p.strip.w / c, H = p.strip.h, cell = (i: number, x: number, y: number) => (x < 0 || x >= W ? 0 : p.strip.data[y * p.strip.w + i * W + x]);
    let mirrored = 0;
    for (let i = 0; i < c / 2; i++) {
      let best = 0;
      for (let o = -4; o <= 4; o++) {
        let same = 0, any = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const a = cell(i, x, y), b = cell(i + c / 2, W - 1 - x + o, y), oa = (a & 255) >= 128, ob = (b & 255) >= 128;
          if (oa || ob) { any++; if (oa && ob && a === b) same++; }
        }
        best = Math.max(best, any ? same / any : 0);
      }
      if (best >= 0.8) mirrored++;
    }
    if (mirrored >= 0.6 * (c / 2)) out.push(`the second half of its cycle is the first flipped (flip: "x"): draw ${c / 2} frames, redraw only what isn't symmetric`);
  }
  const first = p.track.filter((e) => e[0] < p.track[0][0] + c);
  if (first.length === c) {
    const top = Math.min(...first.map((e) => e[2])), bob = first.map((e) => e[2] - top);
    if (Math.max(...bob) >= 1 && Math.max(...bob) <= 4) out.push(`its top over the cycle, px down: ${bob.join(" ")} (the bob)`);
  }
  return out.length ? out.join("; ") : null;
}

function pieceLines(d: ReturnType<typeof decompose>, bands: { y0: number; y1: number; v: number }[], forward: boolean): string[] {
  const out = [`  Backdrop: ${pct(d.still * 100, 100)} of the picture never changes${d.still > 0.2 ? ": one picture (a sprite or the scene's still layers) under everything else" : ""}.`];
  if (bands.length && !forward) out.push(`  Planes: ${bands.length} band${bands.length > 1 ? "s" : ""} of rows going by (see MOTION): each a strip that wraps, scroll().`);
  if (d.relit && d.pieces.some((p) => p.kind === "light")) out.push("  Light: where only the light changes (a lamp pulsing, a fire on the walls) was told apart first and taken away before looking for things, so what it lights isn't taken for a thing; the lights are pieces of their own (each capture shows the light itself, its color as strong as its change).");
  const where = (b: number[]) => `${b[2]}x${b[3]} at ${b[0]},${b[1]}`;
  const dir = (v: [number, number]) => `${Math.abs(v[0]) >= Math.abs(v[1]) ? (v[0] < 0 ? "left" : "right") : v[1] < 0 ? "up" : "down"} at ${Math.hypot(v[0], v[1]).toFixed(2)} px/frame`;
  for (const [i, p] of shown(d.pieces).entries()) {
    // a cycle twice (three times) as long as its drawings are many: each held 2 (3) frames
    const on = p.cycle && p.poses > 1 && p.cycle % p.poses === 0 ? p.cycle / p.poses : 1;
    const draw = `${p.poses} drawing${p.poses === 1 ? "" : "s"}${p.cycle ? `, a cycle of ${p.cycle} frames` : ""}${on > 1 ? ` (each drawing held about ${on} frames: on ${["", "", "twos", "threes", "fours"][on] ?? `${on}s`})` : ""}`;
    const extra = p.round ? `, going round a loop (circling, swinging)` : p.kind === "carried" || p.kind === "walk" ? `, going ${dir(p.speed!)}${p.grow && Math.abs(p.grow - 1) > 0.2 ? `, ${p.grow > 1 ? "growing" : "shrinking"} x${p.grow.toFixed(1)} (${p.grow > 1 ? "coming nearer" : "going away"}: sizes picked by fit)` : ""}${p.parts && p.parts >= 2 ? `, ${p.parts} parts of it moving (limbs: a rig, or a drawing per pose)` : ""}` : p.kind === "rig" ? `, ${p.parts} parts moving` : p.kind === "action" ? `${p.parts && p.parts >= 2 ? `, ${p.parts} parts of it moving` : ""}` : p.source ? `, shining from about ${p.source[0]},${p.source[1]}, x${p.strength!.toFixed(1)} from its dimmest to its brightest, its light ${hex(p.tint!)}` : "";
    const sm = !p.smears ? "" : p.kind === "carried" ? ` Smears on frames ${spans(p.smears.frames)} (${p.smears.colors.map(hex).join(", ")}: there a moment only): a streak behind it on the frames it goes fastest, stamp(name, x, y, { smear: [fromX, fromY] }) (its box and spacing measured without it).`
      : ` Smears on frames ${spans(p.smears.frames)} (${p.smears.colors.map(hex).join(", ")}: there a moment only): the shape the swing sweeps, on the frames it goes fastest, arc(cx, cy, r, from, to, c, { inner, taper }) in a layer with unlit: true, outline: false (characters.md: its last 100 degrees at most, thin at its tail).`;
    const sub = p.sub ? `, moving by part of a pixel (subpixel: its parts stamped with { sub: true } at half-pixel places)` : "";
    // ten times brighter at its brightest than at its dimmest is more than light does to what is there:
    // paint that comes and goes (a flash, a smear, sparks, a limb drawn light then dark)
    const paint = p.kind === "light" && (p.strength ?? 0) > 10;
    out.push(`  #${i + 1} ${where(p.box)}, in ${p.frames} of ${d.frames} frames, ${draw}${extra}${sub}: ${paint ? `read as a light, but more likely paint that comes and goes (a flash, a smear, sparks, a part drawn light then dark): ${WHAT.effect}` : WHAT[p.kind]}.${sm}`);
    // (a thing going somewhere, or an action, over a short clip: elsewhere a box's steps are its drawings
    // changing, a limb reaching out, not the thing moving)
    // a walk whose steps vary (a jump, a dash) is read too; in place, a body squashing on a ground that
    // stays (its bottom row) gets the squash alone
    const steps = p.track.slice(1).map((e, k) => Math.hypot(e[1] + e[3] / 2 - p.track[k][1] - p.track[k][3] / 2, e[2] + e[4] / 2 - p.track[k][2] - p.track[k][4] / 2)).filter((v) => v >= 1);
    const varied = steps.length >= 3 && Math.max(...steps) > 3 * Math.min(...steps);
    const grounded = p.track.every((e) => Math.abs(e[2] + e[4] - p.track[0][2] - p.track[0][4]) <= 1);
    const sp = p.track.length > 24 ? null : (p.kind === "carried" && p.poses <= 4) || p.kind === "action" || (p.kind === "walk" && varied) ? spacingWords(p.track)
      : (p.kind === "anim" || p.kind === "rig") && grounded ? spacingWords(p.track, true) : null;
    if (sp) out.push(`     ${sp}`);
    const half = p.kind === "light" ? null : cycleWords(p);
    if (half) out.push(`     ${half}`);
  }
  const things = d.pieces.filter((p) => p.kind !== "light").length, lights = d.pieces.length - things;
  if (things > 16 || lights > 8) out.push(`  ... and ${[things > 16 ? `${things - 16} smaller things` : "", lights > 8 ? `${lights - 8} smaller lights` : ""].filter(Boolean).join(" and ")}.`);
  if (d.pieces.length) out.push(`  Each one alone, its background taken away: a row of it across the clip in _pieces.png; its frames in a strip of its own, one whole cycle when it has one, in _piece<N>.png (to look at, or to draw over); its box in every frame (its track) in _pieces.json.`);
  if (!d.pieces.length) out.push("  Nothing moves on its own: the picture is still apart from its planes.");
  return out;
}

// digits 3x5, for numbering the pieces on the sheets
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
function number(img: Img, x: number, y: number, n: number, c: Color, s = 1) {
  [...String(n)].forEach((d, k) => { const g = DIGITS[+d]; for (let i = 0; i < 15; i++) if (g[i] === "1") for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const px = x + (k * 4 + (i % 3)) * s + dx, py = y + Math.floor(i / 3) * s + dy; if (img.inside(px, py)) img.set(px, py, c); } });
}

/** Each piece alone: a row of its cutouts across the clip (on a dark checker where it's clear), numbered; and the tracks as data. */
function piecesOut(d: ReturnType<typeof decompose>, ms: number[]): { sheet: Img; json: unknown; strips: Img[] } {
  const list = shown(d.pieces), cell = 48, gap = 4, label = 18;
  const fit = (im: Img) => Math.max(1, Math.min(4, Math.floor(cell / Math.max(im.w, im.h))));
  const rows = list.map((p) => { const s = Math.min(...p.cuts.map(fit)); return { p, s, h: Math.max(...p.cuts.map((c) => c.h)) * s, w: p.cuts.reduce((a, c) => a + c.w * s + gap, 0) }; });
  const W = Math.max(120, ...rows.map((r) => label + r.w + gap)), H = rows.reduce((a, r) => a + Math.max(12, r.h) + gap, gap);
  const out = new Img(W, H);
  out.fill(pack(24, 22, 30));
  let y = gap;
  for (const [i, r] of rows.entries()) {
    number(out, 2, y + 2, i + 1, pack(230, 230, 230), 2);
    let x = label;
    for (const c of r.p.cuts) {
      for (let yy = 0; yy < c.h * r.s; yy++) for (let xx = 0; xx < c.w * r.s; xx++) {
        const v = c.data[Math.floor(yy / r.s) * c.w + Math.floor(xx / r.s)];
        out.set(x + xx, y + yy, (v & 255) >= 128 ? v : ((xx >> 2) + (yy >> 2)) % 2 ? pack(44, 42, 52) : pack(34, 32, 42));
      }
      x += c.w * r.s + gap;
    }
    y += Math.max(12, r.h) + gap;
  }
  const json = {
    frames: d.frames, ms: Math.round(ms.reduce((a, v) => a + v, 0) / ms.length), backdrop: +d.still.toFixed(3),
    pieces: list.map((p, i) => ({ id: i + 1, kind: p.kind, box: p.box, frames: p.frames, drawings: p.poses, cycle: p.cycle, ...(p.speed ? { speed: p.speed.map((v) => +v.toFixed(3)) } : {}), ...(p.grow !== undefined ? { grow: +p.grow.toFixed(2) } : {}), ...(p.parts ? { parts: p.parts } : {}), ...(p.round ? { round: true } : {}), ...(p.smears ? { smears: { frames: p.smears.frames, colors: p.smears.colors.map(hex) } } : {}), ...(p.source ? { source: p.source, strength: +p.strength!.toFixed(2), tint: hex(p.tint!) } : {}), fill: +p.fill.toFixed(2), strip: { file: `_piece${i + 1}.png`, frames: p.stripFrames, w: p.strip.w / p.stripFrames, h: p.strip.h }, track: p.track })),
  };
  return { sheet: out, json, strips: list.map((p) => p.strip) };
}

function blobs(count: Uint16Array, W: number, H: number, min: number) {
  const seen = new Uint8Array(W * H), out: { x: number; y: number; w: number; h: number; n: number; rate: number }[] = [];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || count[i] < min) continue;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0, sum = 0;
    const st = [i]; seen[i] = 1;
    while (st.length) {
      const p = st.pop()!, x = p % W, y = Math.floor(p / W);
      n++; sum += count[p]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && !seen[q] && count[q] >= min) { seen[q] = 1; st.push(q); }
      }
    }
    if (n >= 6) out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n, rate: Math.round(sum / n) });
  }
  return out.sort((a, b) => b.n - a.n);
}

// ---------------------------------------------------------------- the sheet
/**
 * One picture to look at, panels top to bottom: the picture studied (1x or the translation); its
 * techniques marked over it in grey (banding red, checkers magenta, dark lines cyan, in-between tones yellow; a
 * line's L-corners ringed orange, its jaggies blue); its
 * straight edges colored by where they meet (red, green, blue, orange; the rest yellow), the vanishing points
 * and the horizon (cyan); the ramps, one row each, dark to light; for an animation, frames across
 * the clip, and the flow (white ticks along each block's motion, the point it opens out from in
 * magenta, the planes as bars down the left in their speeds' order); the pieces, boxed by kind
 * (carried cyan, walk green, stream blue, in place yellow, rig orange, effect magenta hatched, light white).
 */
function sheet(pic: Img, t: Techniques, pixelArt: boolean, P: Img, segs: Segment[], vps: Vanish[], horizon: number | null, ramps: Ramp[], m: ReturnType<typeof motionOf> | null, lf: ReturnType<typeof lineFlaws> | null): Img {
  const s = Math.max(1, Math.min(8, Math.floor(480 / pic.w))), Wd = pic.w * s, panels: Img[] = [];
  const grey = (img: Img) => { const o = new Img(img.w, img.h); for (let i = 0; i < img.data.length; i++) { const c = img.data[i]; if ((c & 255) < 128) continue; const v = Math.round(40 + 90 * lab(c)[0]); o.data[i] = pack(v, v, v); } return o; };
  panels.push(pic.scale(s));
  if (pixelArt) {
    const g = grey(pic);
    for (let i = 0; i < t.mask.length; i++) { const k = t.mask[i]; if (k & 8) g.data[i] = pack(240, 60, 50); else if (k & 1) g.data[i] = pack(230, 60, 220); else if (k & 2) g.data[i] = pack(60, 220, 230); else if (k & 4) g.data[i] = pack(240, 220, 60); }
    const gs = g.scale(s);
    // a line's flaws ringed, so they can be found: L-corners orange, jaggies blue (the pixel itself when small)
    const ring = (x: number, y: number, c: Color) => { if (s < 3) { gs.set(x * s, y * s, c); return; } for (let i = 0; i < s; i++) for (const [u, v] of [[i, 0], [i, s - 1], [0, i], [s - 1, i]]) gs.set(x * s + u, y * s + v, c); };
    for (const [x, y] of lf?.corners ?? []) ring(x, y, pack(255, 140, 20));
    for (const [x, y] of lf?.jaggies ?? []) ring(x, y, pack(40, 120, 255));
    panels.push(gs);
  }
  const ps = Wd / P.w, pg = grey(P).scale(Math.max(1, Math.round(ps)));
  const z = pg.w / P.w, col = [pack(240, 70, 70), pack(80, 230, 90), pack(90, 140, 255), pack(240, 150, 60)];
  for (const sg of segs) { const i = vps.findIndex((v) => v.lines.includes(sg)); line(pg, sg.x0 * z, sg.y0 * z, sg.x1 * z, sg.y1 * z, i >= 0 ? col[i] : pack(230, 210, 60)); }
  for (const [i, v] of vps.entries()) if (!v.far) {
    const x = v.x * z, y = v.y * z;
    for (const sg of v.lines) { const mx = ((sg.x0 + sg.x1) / 2) * z, my = ((sg.y0 + sg.y1) / 2) * z; dashed(pg, mx, my, x, y, col[i]); }
    line(pg, x - 6, y, x + 6, y, col[i]); line(pg, x, y - 6, x, y + 6, col[i]);
  }
  if (horizon !== null) line(pg, 0, horizon * z, pg.w, horizon * z, pack(70, 220, 230));
  panels.push(pg);
  // the ramps
  const sw = 12, rows = [...ramps.filter((r) => r.colors.length > 1), ...ramps.filter((r) => r.colors.length === 1)].slice(0, 16), rp = new Img(Wd, rows.length * (sw + 2) + 2);
  rows.forEach((r, j) => r.colors.slice(0, Math.floor(Wd / (sw + 2))).forEach((c, i) => { for (let y = 0; y < sw; y++) for (let x = 0; x < sw; x++) rp.set(2 + i * (sw + 2) + x, 2 + j * (sw + 2) + y, c); }));
  panels.push(rp);
  if (m) {
    const k = Math.min(6, m.frames.length), tw = Math.floor(Wd / k), strip = new Img(Wd, Math.max(1, Math.round((tw * m.H) / m.W)));
    for (let i = 0; i < k; i++) { const f = m.frames[Math.floor((i * (m.frames.length - 1)) / Math.max(1, k - 1))], th = areaDown(f, tw - 2, strip.h); strip.blit(th, i * tw, 0); }
    panels.push(strip);
    const fs = Math.max(1, Math.round(Wd / m.W)), fl = grey(m.frames[0]).scale(fs);
    for (const f of m.flows) if (f.dx || f.dy) line(fl, f.x * fs, f.y * fs, (f.x + f.dx * 2) * fs, (f.y + f.dy * 2) * fs, pack(250, 250, 250));
    if (m.foe && m.forward) { const x = m.foe.x * fs, y = m.foe.y * fs; line(fl, x - 8, y, x + 8, y, pack(240, 60, 220)); line(fl, x, y - 8, x, y + 8, pack(240, 60, 220)); }
    const top = Math.max(1, ...m.bands.map((b) => Math.abs(b.v)));
    for (const b of m.bands) for (let y = Math.max(0, b.y0 * fs); y < Math.min(fl.h, b.y1 * fs); y++) for (let x = 0; x < Math.max(2, Math.round((Math.abs(b.v) / top) * 24)); x++) fl.set(x, y, pack(240, 200, 60));
    panels.push(fl);
    if (m.layers) {
      const PC: Record<Piece["kind"], Color> = { carried: pack(70, 220, 230), walk: pack(80, 230, 90), stream: pack(90, 140, 255), anim: pack(240, 220, 60), rig: pack(240, 150, 60), effect: pack(230, 60, 220), action: pack(255, 110, 110), light: pack(250, 250, 250) };
      const pp = grey(m.frames[0]).scale(fs);
      for (const [i, p] of shown(m.layers.pieces).entries()) {
        const [x, y, w, h] = p.box.map((v) => v * fs), c = PC[p.kind];
        number(pp, x + 1, Math.max(0, y - 6), i + 1, c);
        line(pp, x, y, x + w - 1, y, c); line(pp, x, y + h - 1, x + w - 1, y + h - 1, c); line(pp, x, y, x, y + h - 1, c); line(pp, x + w - 1, y, x + w - 1, y + h - 1, c);
        if (p.kind === "effect") for (let k = 0; k < w + h; k += 4) line(pp, x + Math.max(0, k - h), y + Math.min(h - 1, k), x + Math.min(w - 1, k), y + Math.max(0, k - w), c);
      }
      panels.push(pp);
    }
  }
  const gap = 6, W = Math.max(...panels.map((p) => p.w)), H = panels.reduce((a, p) => a + p.h + gap, gap), out = new Img(W + 2 * gap, H);
  out.fill(pack(24, 22, 30));
  let y = gap;
  for (const p of panels) { out.blit(p, gap, y); y += p.h + gap; }
  return out;
}
function line(img: Img, x0: number, y0: number, x1: number, y1: number, c: Color) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n); if (img.inside(x, y)) img.set(x, y, c); }
}
function dashed(img: Img, x0: number, y0: number, x1: number, y1: number, c: Color) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) if (i % 6 < 2) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n); if (img.inside(x, y)) img.set(x, y, c); }
}
