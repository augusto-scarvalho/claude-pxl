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
import { type Color, pack, toHex } from "./color.ts";
import { Img } from "./image.ts";
import { type Flow, type Grid, type Ramp, type Segment, type Techniques, type Vanish, areaDown, bandShifts, blockFlow, colorCounts, dE, findGrid, findRamps, findSegments, findTiles, findVanishing, focusOfExpansion, frameDiff, lab, lch, lumaOf, mergeNear, quantize, techniques, toNative } from "./vision.ts";

/** frames as read; `drawnAt`: they were already brought down from that grid as they were read (big animations) */
export interface StudyInput { name: string; frames: Img[]; ms: number[]; kind: string; drawnAt?: Grid }
export interface StudyOpts { colors?: number; to?: [number, number] }
export interface StudyOut { text: string[]; sheet: Img; picture: Img; pixelArt: boolean; palette: Color[] }

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
  const pre = !!input.drawnAt, g = input.drawnAt ?? findGrid(first), up = g.sx > 1 || g.sy > 1;
  // a copy that was blurred, compressed or scaled by a fraction has its colors smeared: fold them harder
  const smeared = !Number.isInteger(g.sx) || /JPG|JPEG|WEBP|video/i.test(input.kind);
  const native = up && !pre ? toNative(first, g) : first, folded = mergeNear(native, smeared ? 0.07 : 0.03);
  // pixel art: few colors and hard steps between them, once a copy's noise is folded away; a grid
  // found under the noise says so too
  const nColors = colorCounts(folded).size, smooth = smoothShare(folded);
  const pixelArt = nColors <= 256 && (up || smooth < 0.35);
  const dur = input.ms.reduce((s, v) => s + v, 0);
  text.push(`${input.name}: ${pre ? `${Math.round(first.w * g.sx)}x${Math.round(first.h * g.sy)}` : `${first.w}x${first.h}`}${input.frames.length > 1 ? `, ${input.frames.length} frames over ${(dur / 1000).toFixed(1)} s` : ""} (${input.kind})`);

  // the picture studied: the drawing at 1x, or a translation of the rest into few colors
  let picture: Img, scale = 1, avg: Img;
  if (pixelArt) {
    picture = folded; avg = folded;
    text.push(`Kind: pixel art${up ? `, drawn at ${g.sx === g.sy ? `${+g.sx.toFixed(2)}x` : `${+g.sx.toFixed(2)}x${+g.sy.toFixed(2)}`} (each pixel ${+g.sx.toFixed(2)}x${+g.sy.toFixed(2)} px, the grid from ${+g.ox.toFixed(1)},${+g.oy.toFixed(1)})${Number.isInteger(g.sx) ? "" : ": blurred or scaled by a fraction, read in the middle of each pixel"}` : " at 1x"}: ${picture.w}x${picture.h} as drawn, ${nColors} colors.`);
  } else {
    const [tw, th] = opts.to ?? fit(first.w, first.h, 160);
    avg = areaDown(first, tw, th);
    const q = quantize(avg, opts.colors ?? 16);
    picture = q.img; scale = tw / first.w;
    text.push(`Kind: not pixel art (a photo, painting or render: ${nColors} colors after folding near ones, ${pct(smooth * 100, 100)} of the steps between neighbors gentle). Read for its masses, colors and light, and translated into a ${tw}x${th} picture in ${q.palette.length} colors to draw over (--to WxH, --colors N).`);
  }
  const ramps = findRamps(picture), tech = techniques(picture, ramps);

  // ---------------------------------------------------------------- palette and ramps
  text.push("", "PALETTE AND RAMPS (dark to light; % of the picture)");
  const total = tech.pixels;
  ramps.slice(0, 12).forEach((r, i) => {
    const share = r.counts.reduce((s, v) => s + v, 0);
    if (share < total * 0.004 && i > 3) return;
    text.push(`  ${i + 1}. ${r.neutral ? "greys" : hueName(lch(r.colors[Math.floor(r.colors.length / 2)]).h)}, ${r.colors.length} tone${r.colors.length > 1 ? "s" : ""}, ${pct(share, total)}: ${r.colors.slice(0, 10).map(hex).join(" ")}${r.colors.length > 10 ? " ..." : ""}${shiftWords(r)}`);
  });
  if (ramps.length > 12) text.push(`  ... ${ramps.length - 12} more, small`);
  const sizes = ramps.filter((r) => r.colors.length > 1).map((r) => r.colors.length).sort((a, b) => a - b);
  if (sizes.length) text.push(`  ${ramps.length} ramps; a ramp's tones: ${sizes[0]} to ${sizes[sizes.length - 1]}, most ${sizes[sizes.length >> 1]}.`);

  // ---------------------------------------------------------------- techniques
  if (pixelArt) {
    text.push("", "TECHNIQUES");
    if (tech.edge) {
      const e = tech.edge, n = e.black + e.selective + e.none;
      text.push(`  Edge against the clear: ${pct(e.black, n)} near-black (an outline), ${pct(e.selective, n)} a darker shade of the inside (selective outline), ${pct(e.none, n)} the fill itself (no outline).`);
    }
    text.push(tech.lines > total * 0.01
      ? `  Inner lines: thin dark lines between lighter neighbors on ${pct(tech.lines, total)} of the pixels: ${pct(tech.selective, tech.lines)} a darker shade of what they border (selective), ${pct(tech.black, tech.lines)} near-black.`
      : `  Inner lines: hardly any (${pct(tech.lines, total)}): shapes meet by their tones, not by lines.`);
    text.push(tech.dither > total * 0.005
      ? `  Dithering: 2x2 checkers on ${pct(tech.dither, total)} of the pixels${tech.ditherRows ? `, rows ${tech.ditherRows[0]}-${tech.ditherRows[1]}` : ""}, mostly ${tech.ditherPairs.map(([a, b]) => `${hex(a)}/${hex(b)}`).join(", ")}: a blend between two tones.`
      : `  Dithering: none to speak of (${pct(tech.dither, total)}).`);
    text.push(`  Anti-aliasing: in-between tones on the steps of edges on ${pct(tech.aa, total)} of the pixels${tech.aa > total * 0.01 ? " (edges smoothed by hand)" : " (hard edges)"}.`);
    text.push(`  Clusters: ${pct(tech.orphans, total)} of the pixels stand alone (none of their four neighbors share their color)${tech.orphans > total * 0.12 ? ": a busy, noisy texture" : tech.orphans < total * 0.03 ? ": clean clusters" : ""}.`);
    const tiles = findTiles(picture);
    if (tiles) text.push(`  Tiles: ${tiles.size}x${tiles.size} cells from ${tiles.ox},${tiles.oy} repeat: ${tiles.distinct} distinct of ${tiles.cells} (${pct(tiles.cells - tiles.distinct, tiles.cells)} repeats).`);
  }
  text.push(...lightLines(tech, ramps, pixelArt));

  // ---------------------------------------------------------------- values, color, distance
  text.push("", "VALUES AND COLOR");
  text.push(...valueLines(avg));

  // ---------------------------------------------------------------- motion, then perspective
  let motion: ReturnType<typeof motionOf> | null = null;
  if (input.frames.length > 1) {
    const frames = input.frames.map((f) => (pixelArt ? (up && !pre ? toNative(f, g) : f) : areaDown(f, ...fit(f.w, f.h, 320))));
    motion = motionOf(frames, input.ms);
  }
  const P = pixelArt ? picture : areaDown(first, ...fit(first.w, first.h, 480));
  const segs = findSegments(P), vps = findVanishing(segs, P.w, P.h), k = picture.w / P.w;
  const foe = motion?.foe && motion.forward ? { x: (motion.foe.x * P.w) / motion.W, y: (motion.foe.y * P.w) / motion.W } : null;
  text.push("", "PERSPECTIVE");
  const persp = perspectiveLines(segs, vps, P.w, P.h, k, picture.w, foe);
  text.push(...persp.lines);
  if (motion) text.push("", "MOTION", ...motion.lines);

  // ---------------------------------------------------------------- in pxl
  text.push("", "IN PXL");
  text.push(`  The palette: use("${input.name}.hex") (written with the sheet), ramps as listed${pixelArt ? "" : "; or reduce it: it is the translation's"}.`);
  if (pixelArt) {
    text.push(`  A picture ${picture.w}x${picture.h} at 1x.`);
    if (tech.edge && tech.edge.black > tech.edge.selective) text.push(`  Its outline: outline: "<near-black key>".`);
    else if (tech.edge && tech.edge.selective > tech.edge.none) text.push(`  Its outline: selout: "<dark key>" (the outline takes a dark shade of what it touches).`);
    if (tech.dither > total * 0.005) text.push("  Its blends: dither() between two keys, or bayer(x, y) in a function for a gradient.");
    if (tech.light[0] && tech.light[0].sure > 0.15) text.push(`  Its light, from ${way(tech.light[0].dir)}: relight / plate with light: [${tech.light[0].dir.map((v) => (v / Math.hypot(...tech.light[0].dir)).toFixed(1)).join(", ")}], capsule's light the same.`);
  } else text.push(`  The translation (${input.name}_px.png) as a guide: sprite("ref", { png: "${input.name}_px.png" }) in a layer with ref: true, drawn over in the palette; the masses and the light are the lesson, not its pixels.`);
  if (persp.pxl) text.push(`  ${persp.pxl}`);
  if (motion) text.push(...motion.pxl.map((l) => `  ${l}`));

  const palette = ramps.flatMap((r) => r.colors);
  return { text, sheet: sheet(picture, tech, pixelArt, P, segs, vps, persp.horizon, ramps, motion), picture, pixelArt, palette };
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

function shiftWords(r: Ramp): string {
  if (r.neutral || r.colors.length < 3) return "";
  const d = lch(r.colors[0]), l = lch(r.colors[r.colors.length - 1]);
  let dh = l.h - d.h;
  dh = ((dh + 540) % 360) - 180;
  if (Math.abs(dh) < 8) return "; one hue throughout";
  const toward = (h: number) => hueName(h).split(" ")[0];
  return `; hue shifts ${Math.round(Math.abs(dh))}° from ${toward(d.h)} in the shade to ${toward(l.h)} in the light${l.C < d.C * 0.75 ? ", paler in the light" : l.C > d.C * 1.3 ? ", richer in the light" : ""}`;
}

function lightLines(t: Techniques, ramps: Ramp[], pixelArt: boolean): string[] {
  const sure = t.light.filter((l) => l.sure > 0.12).slice(0, 4);
  if (!sure.length) return ["  Light: no side is lit more than another (flat, or lit from the front)."];
  const name = (r: Ramp) => (r.neutral ? "the greys" : `the ${hueName(lch(r.colors[Math.floor(r.colors.length / 2)]).h)}`);
  const words = sure.map((l) => `${name(ramps[l.ramp])} (ramp ${l.ramp + 1}) lighter toward ${way(l.dir)} (${l.sure.toFixed(2)})`);
  return [`  Light${pixelArt ? "" : " (in the translation)"}, read off where each ramp's lighter tones lie (1 = always): ${words.join("; ")}.${sure.some((l) => l.dir[1] > 0.5 * l.sure && Math.abs(l.dir[0]) < 0.3 * l.sure) ? " Lighter downward is often a sky toward its horizon." : ""}`];
}

function valueLines(img: Img): string[] {
  const L: number[] = [], out: string[] = [];
  let bx = 0, by = 0, bn = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const c = img.data[y * img.w + x]; if ((c & 255) >= 128) L.push(lab(c)[0]); }
  if (!L.length) return out;
  const sorted = L.slice().sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.98)];
  const mean = L.reduce((s, v) => s + v, 0) / L.length, sd = Math.sqrt(L.reduce((s, v) => s + (v - mean) ** 2, 0) / L.length);
  const dark = L.filter((v) => v < 0.4).length, light = L.filter((v) => v > 0.7).length;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const c = img.data[y * img.w + x]; if ((c & 255) >= 128 && lab(c)[0] >= top) { bx += x; by += y; bn++; } }
  out.push(`  Values: ${mean < 0.4 ? "low key (dark)" : mean > 0.65 ? "high key (light)" : "mid key"}, mean lightness ${mean.toFixed(2)}, contrast ${sd.toFixed(2)}; dark ${pct(dark, L.length)}, middle ${pct(L.length - dark - light, L.length)}, light ${pct(light, L.length)}. The brightest 2% gather around ${Math.round(bx / bn)},${Math.round(by / bn)} of ${img.w}x${img.h}.`);
  // the light's color against the shadows': the lightest fifth against the darkest
  const cs = [...img.data].filter((c) => (c & 255) >= 128).map((c) => lab(c)).sort((p, q) => p[0] - q[0]);
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
  const finite = vps.filter((v) => !v.far), near = finite.filter((v) => Math.abs(v.x - W / 2) < 1.5 * W && v.y > -H && v.y < 2 * H);
  for (const v of vps) {
    const share = pct(v.lines.reduce((s, q) => s + q.len, 0), total);
    const verticalish = Math.abs(v.dir[1]) > 0.9;
    if (v.far) out.push(`  - ${v.lines.length} lines parallel in the picture (${share} of their length), ${verticalish ? "upright: uprights stay upright (no third point)" : Math.abs(v.dir[0]) > 0.9 ? "level: lines across stay level" : `at ${Math.round((Math.atan2(v.dir[1], v.dir[0]) * 180) / Math.PI)}°: an oblique set (isometric or a side view)`}.`);
    else out.push(`  - ${v.lines.length} lines meet at ${Math.round(v.x * k)},${Math.round(v.y * k)} (${share} of their length)${verticalish ? `: uprights converge ${v.y < H / 2 ? "above" : "below"} (three-point, the camera tilted ${v.y < H / 2 ? "up" : "down"})` : ""}.`);
  }
  const level = finite.filter((v) => Math.abs(v.dir[1]) <= 0.9), cx = W / 2, cy = H / 2;
  // two-point: two level points on one horizon, either side of the middle, square to each other through a believable lens
  let two: [Vanish, Vanish, number] | null = null;
  for (let i = 0; i < level.length && !two; i++) for (let j = i + 1; j < level.length; j++) {
    const a = level[i], b = level[j], f2 = -((a.x - cx) * (b.x - cx) + (a.y - cy) * (b.y - cy));
    const fov = f2 > 0 ? (2 * Math.atan(W / 2 / Math.sqrt(f2)) * 180) / Math.PI : 180;
    if (Math.abs(a.y - b.y) < 0.12 * H && (a.x - cx) * (b.x - cx) < 0 && fov > 20 && fov < 120) { two = a.x < b.x ? [a, b, Math.sqrt(f2)] : [b, a, Math.sqrt(f2)]; break; }
  }
  // one-point: the level point inside the picture's reach the motion opens out from, else the one most lines meet at
  const inside = near.filter((v) => Math.abs(v.dir[1]) <= 0.9);
  const byFoe = foe ? inside.filter((v) => Math.hypot(v.x - foe.x, v.y - foe.y) < 0.2 * W).sort((a, b) => Math.hypot(a.x - foe.x, a.y - foe.y) - Math.hypot(b.x - foe.x, b.y - foe.y))[0] : undefined;
  if (two) {
    const [a, b, f] = two, hy = (a.y + b.y) / 2;
    horizon = hy;
    out.push(`  Two-point perspective: the horizon at row ${Math.round(hy * k)}; if the two sets are square to each other, a focal length of ~${Math.round(f * k)} px (fov ~${Math.round((2 * Math.atan(W / 2 / f) * 180) / Math.PI)}°).`);
    pxl = `perspective({ w: ${PW}, horizon: ${Math.round(hy * k)}, eye: <m>, yaw: <deg>, focal: ${Math.round(f * k)} }): turn yaw until vanish(0) and vanish(90) land near ${Math.round(a.x * k)} and ${Math.round(b.x * k)}.`;
  } else if (byFoe || inside.length) {
    const v = byFoe ?? inside.sort((a, b) => b.weight - a.weight)[0];
    horizon = v.y;
    out.push(`  One-point perspective: the horizon at row ${Math.round(v.y * k)}, the camera looking at column ${Math.round(v.x * k)}${byFoe ? " (where the motion opens out from too)" : ""}.${inside.length > 1 ? " The other points are other things' own (a box turned another way, an interior's lines)." : ""}`);
    pxl = `perspective({ w: ${PW}, horizon: ${Math.round(v.y * k)}, vp: ${Math.round(v.x * k)}, eye: <m>, fov: <deg> }): the eye's height and the lens aren't in the picture: choose them by how big things there are.`;
  } else if (!finite.length) out.push("  No lines meet: a flat, side-on or orthographic view.");
  return { lines: out, pxl, horizon };
}

function motionOf(frames: Img[], ms: number[]) {
  const lines: string[] = [], pxl: string[] = [];
  const W = frames[0].w, H = frames[0].h, L = frames.map(lumaOf), n = frames.length;
  const fps = 1000 / (ms.reduce((s, v) => s + v, 0) / ms.length);
  const consec = L.slice(1).map((l, i) => frameDiff(L[i], l)), held = consec.filter((d) => d === 0).length;
  const med = consec.slice().sort((a, b) => a - b)[consec.length >> 1] || 0;
  const delays = [...new Set(ms)];
  lines.push(`  Timing: ${n} frames, ${delays.length === 1 ? `${delays[0]} ms each (${fps.toFixed(fps < 10 ? 1 : 0)} fps)` : `${Math.min(...delays)}-${Math.max(...delays)} ms (held poses differ)`}; ${held} repeat the frame before (holds).`);
  const seam = frameDiff(L[n - 1], L[0]);
  lines.push(`  Loop: ${seam <= Math.max(1.6 * med, 0.002) ? "the last frame runs into the first (a loop that closes)" : `the last frame jumps to the first (${(seam / (med || 1e-9)).toFixed(1)}x a usual step): not a closed loop, or a clip from a longer one`}.`);
  // a cycle: the shortest shift after which frames repeat
  let cycle = 0;
  for (let p = 2; p <= Math.min(n - 1, 120) && med > 0; p++) {
    let s = 0, c = 0;
    for (let i = 0; i + p < n && c < 40; i += Math.max(1, Math.floor((n - p) / 40))) { s += frameDiff(L[i], L[i + p]); c++; }
    if (c && s / c < 0.35 * med) { cycle = p; break; }
  }
  if (cycle) { lines.push(`  Cycle: the frames repeat every ${cycle} (${((cycle * 1000) / fps / 1000).toFixed(2)} s)${n >= 2 * cycle ? `, ${(n / cycle).toFixed(1)} times in the clip` : ""}.`); pxl.push(`anim(name, { frames: ${cycle}, fps: ${Math.round(fps)} }) for the cycle.`); }
  else lines.push("  Cycle: no shorter cycle repeats within the clip.");
  // the flow between a few pairs of frames spread over the clip
  const pairs = Array.from({ length: Math.min(10, n - 1) }, (_, i) => Math.floor((i * (n - 1)) / Math.min(10, n - 1)));
  const flows: Flow[] = [];
  const r = Math.min(12, Math.floor(Math.min(W, H) / 6));
  for (const i of pairs) if (consec[i] > 0) flows.push(...blockFlow(L[i], L[i + 1], W, H, 8, r));
  const moving = flows.filter((f) => f.dx || f.dy), still = flows.length - moving.length;
  const foe = focusOfExpansion(flows);
  lines.push(`  Flow: ${flows.length} textured blocks matched over ${pairs.length} pairs of frames: ${pct(still, flows.length)} stand still, ${pct(moving.length, flows.length)} move.`);
  let bands: { y0: number; y1: number; v: number }[] = [];
  // a camera moving forward moves much of the picture, most of it straight out from one point
  const forward = !!foe && foe.n >= 25 && foe.agree >= 0.4 && moving.length >= 0.15 * flows.length;
  if (forward) {
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
  bands = bands.filter((b) => Math.abs(b.v) >= 0.1);
  if (bands.length) {
    const sorted = bands.slice().sort((a, b) => Math.abs(a.v) - Math.abs(b.v));
    lines.push(`  Planes going by (bands of rows carried across together): ${bands.map((b) => `rows ${b.y0}-${b.y1} at ${Math.abs(b.v).toFixed(2)} px/frame ${b.v < 0 ? "left" : "right"} (${(Math.abs(b.v) * fps).toFixed(0)} px/s)`).join("; ")}.${bands.length > 1 ? ` Parallax: ${sorted.length} speeds from ${Math.abs(sorted[0].v).toFixed(2)} to ${Math.abs(sorted[sorted.length - 1].v).toFixed(2)} px/frame, each its own plane, the faster the nearer.` : ""}`);
    pxl.push(`scroll(name, y, per) for each plane, per = its speed x the loop's frames (here ${bands.map((b) => Math.round(Math.abs(b.v) * n)).join(", ")} px over ${n} frames), a whole number of each strip's widths.`);
  }
  // the parts that move while the rest stands still
  if (still > moving.length) {
    const count = new Uint16Array(W * H);
    for (let i = 0; i + 1 < n; i++) for (let p = 0; p < W * H; p++) if (Math.abs(L[i][p] - L[i + 1][p]) > 0.04) count[p]++;
    const regions = blobs(count, W, H, Math.max(1, Math.floor((n - 1) * 0.1)));
    if (regions.length) lines.push(`  Moving parts on a still picture: ${regions.slice(0, 5).map((b) => `${b.w}x${b.h} at ${b.x},${b.y} (changing in ${pct(b.rate, n - 1)} of the steps)`).join("; ")}.`);
  }
  if (moving.length && moving.every((f) => Number.isInteger(f.dx) && Number.isInteger(f.dy))) lines.push("  Steps are whole pixels at 1x (as measured: block matching moves whole pixels).");
  return { lines, pxl, flows, foe, forward, bands, frames, W, H };
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
 * techniques marked over it in grey (checkers magenta, dark lines cyan, in-between tones yellow); its
 * straight edges colored by where they meet (red, green, blue; the rest yellow), the vanishing points
 * and the horizon (cyan); the ramps, one row each, dark to light; for an animation, frames across
 * the clip, and the flow (white ticks along each block's motion, the point it opens out from in
 * magenta, the planes as bars down the left in their speeds' order).
 */
function sheet(pic: Img, t: Techniques, pixelArt: boolean, P: Img, segs: Segment[], vps: Vanish[], horizon: number | null, ramps: Ramp[], m: ReturnType<typeof motionOf> | null): Img {
  const s = Math.max(1, Math.min(8, Math.floor(480 / pic.w))), Wd = pic.w * s, panels: Img[] = [];
  const grey = (img: Img) => { const o = new Img(img.w, img.h); for (let i = 0; i < img.data.length; i++) { const c = img.data[i]; if ((c & 255) < 128) continue; const v = Math.round(40 + 90 * lab(c)[0]); o.data[i] = pack(v, v, v); } return o; };
  panels.push(pic.scale(s));
  if (pixelArt) {
    const g = grey(pic);
    for (let i = 0; i < t.mask.length; i++) { const k = t.mask[i]; if (k & 1) g.data[i] = pack(230, 60, 220); else if (k & 2) g.data[i] = pack(60, 220, 230); else if (k & 4) g.data[i] = pack(240, 220, 60); }
    panels.push(g.scale(s));
  }
  const ps = Wd / P.w, pg = grey(P).scale(Math.max(1, Math.round(ps)));
  const z = pg.w / P.w, col = [pack(240, 70, 70), pack(80, 230, 90), pack(90, 140, 255)];
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
