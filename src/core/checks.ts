// Checks that read the pixels against what the art says about itself: a part's `front` socket
// against its `facing`, the side its drawing is lit from against the light it should be under, and
// where its feet are against where it was stamped. `facing` itself is a label; these are what can
// catch a label that doesn't match the drawing.
import { type Color, TRANSPARENT } from "./color.ts";
import type { Img } from "./image.ts";
import type { Palette } from "./palette.ts";

/** Each ramp color's ramp and step (dark to light), for reading light as steps along a ramp. */
export type Steps = Map<Color, [number, number]>;
export function rampSteps(pal: Palette): Steps {
  const m: Steps = new Map();
  pal.ramps.forEach((r, ri) => [...r].forEach((k, i) => {
    let c;
    try { c = pal.resolve(k); } catch { return; }
    if (c !== null && c !== TRANSPARENT && !m.has(c)) m.set(c, [ri, i]);
  }));
  return m;
}

const lum = (c: Color) => (0.2126 * ((c >>> 24) & 255) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255)) / 255;

/** A direction in words: "the top right", "the left". y points down. */
export function dirWords(x: number, y: number): string {
  const m = Math.hypot(x, y) || 1, h = x / m > 0.38 ? "right" : x / m < -0.38 ? "left" : "", v = y / m < -0.38 ? "top" : y / m > 0.38 ? "bottom" : "";
  return "the " + [v, h].filter(Boolean).join(" ");
}

/**
 * Which way the drawing is lit, from its rim: the light direction L that best explains, for each
 * pixel on its edge (one step in past an outline, when the edge is mostly one color), how much
 * lighter it is than the material a few px further in, given the sides it is open on (e): b = L . e.
 * With the palette's ramps (`steps`), "lighter" is steps up the same ramp, and only pairs on one
 * ramp count: a light wood end grain next to dark bark, or hair next to skin, is material, not light.
 * Without them, luminance (any pair). Least squares, refit without the fifth that fit worst (a slit
 * or a seam just inside an edge). An axis the shape can't tell apart from the other is left at 0: a
 * thin diagonal's top edges are its left ones. Undefined when it's lit evenly, or too thin to tell.
 */
export function litDir(img: Img, steps?: Steps): [number, number] | undefined {
  const W = img.w, H = img.h, at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? TRANSPARENT : img.data[y * W + x]);
  const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // the outline: the color most of the edge pixels share
  const edge = new Map<Color, number>();
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (c !== TRANSPARENT && sides.some(([dx, dy]) => at(x + dx, y + dy) === TRANSPARENT)) { edge.set(c, (edge.get(c) ?? 0) + 1); n++; }
  }
  if (!n) return undefined;
  const [ink, inkN] = [...edge].sort((a, b) => b[1] - a[1])[0], outline = inkN > n * 0.6 ? ink : undefined;
  const open = (x: number, y: number) => { const c = at(x, y); return c === TRANSPARENT || c === outline; };
  // the rim: each pixel open on some side, how it faces (e), and how much lighter it is than the
  // material up to 3 px inward, against e (b)
  const rim: { ex: number; ey: number; b: number }[] = [];
  let edges = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (open(x, y)) continue;
    const ex = (open(x + 1, y) ? 1 : 0) - (open(x - 1, y) ? 1 : 0), ey = (open(x, y + 1) ? 1 : 0) - (open(x, y - 1) ? 1 : 0);
    if (!ex && !ey) continue;
    edges++;
    let d: Color = TRANSPARENT;
    for (let i = 1; i <= 3; i++) {
      const q = at(x - Math.sign(ex) * i, y - Math.sign(ey) * i);
      if (q === TRANSPARENT || q === outline) break;
      d = q;
    }
    if (d === TRANSPARENT) continue;
    if (!steps) { rim.push({ ex, ey, b: lum(at(x, y)) - lum(d) }); continue; }
    const sc = steps.get(at(x, y)), sd = steps.get(d);
    if (sc && sd && sc[0] === sd[0]) rim.push({ ex, ey, b: sc[1] - sd[1] });
  }
  // too thin to read (a blade, a rope), or too few pairs on one ramp: most of its rim has nothing
  // behind it to compare with
  if (rim.length < 6 || rim.length < edges / (steps ? 3 : 2)) return undefined;
  const fit = (pts: typeof rim) => {
    let axx = 0, ayy = 0, axy = 0, rx = 0, ry = 0;
    for (const { ex, ey, b } of pts) { axx += ex * ex; ayy += ey * ey; axy += ex * ey; rx += b * ex; ry += b * ey; }
    const det = axx * ayy - axy * axy;
    // what the shape leaves of each axis once the other is accounted for (a Schur complement)
    const xOk = axx > 0 && det / (ayy || 1) >= 0.35 * axx, yOk = ayy > 0 && det / (axx || 1) >= 0.35 * ayy;
    if (xOk && yOk) return [(ayy * rx - axy * ry) / det, (axx * ry - axy * rx) / det];
    if (xOk) return [rx / axx, 0];
    if (yOk) return [0, ry / ayy];
    return [0, 0];
  };
  let L = fit(rim);
  const kept = rim.map((p) => ({ p, r: Math.abs(p.b - L[0] * p.ex - L[1] * p.ey) })).sort((u, v) => u.r - v.r);
  L = fit(kept.slice(0, Math.ceil(kept.length * 0.8)).map(({ p }) => p));
  const v: [number, number] = [L[0], L[1]];
  return Math.hypot(...v) < (steps ? 0.15 : 0.04) ? undefined : v;
}

/**
 * The side a drawing is lit from, checked against the light it should be under ([x, y] toward the
 * light). It only claims what the rim shows clearly: a side (left or right) at 0.3 ramp steps or more
 * (0.08 in luminance), and nothing when the reading says lit from below while the light comes from
 * above (a symmetric plant, a few pixels: noise, not light). Read on art it wasn't tuned on: stones,
 * rocks and props shaded at their rims agree; a flipped variant is caught; a building whose outline is
 * mostly trims (cornice, steps) can still read wrong. Look before trusting a warning.
 */
export function lightWords(img: Img, light?: [number, number], steps?: Steps): string {
  const d = litDir(img, steps);
  if (!d) return "";
  const m = Math.hypot(...d);
  if (light && light[1] < -0.2 && d[1] > 0.2 * m) return "";
  const side = Math.abs(d[0]) >= (steps ? 0.3 : 0.08) && Math.abs(d[0]) >= 0.25 * m;
  const from = `lit from ${side ? dirWords(d[0], d[1]) : dirWords(0, d[1])}`;
  if (!light) return from;
  if (side && Math.abs(light[0]) > 0.2 && Math.sign(d[0]) !== Math.sign(light[0]))
    return `WARNING: ${from}, but its light comes from ${dirWords(light[0], light[1])} (a flipped drawing carries its light to the other side)`;
  return `${from}${side ? ", as its light" : ""}`;
}

/**
 * A part's `front` socket (a point on its nose, its toe, its blade's tip) against its facing: the
 * marker has to sit on the drawing, on the half it faces. The drawing is what the marker points at,
 * so this catches a label that disagrees with the pixels.
 */
export function frontWords(img: Img): string {
  const f = img.orient?.f, s = img.sockets?.front, b = img.bounds();
  if (!s || !b) return "";
  let on = false;
  for (let y = Math.floor(s[1]) - 1; y <= Math.floor(s[1]) && !on; y++)
    for (let x = Math.floor(s[0]) - 1; x <= Math.floor(s[0]) && !on; x++)
      if (x >= 0 && y >= 0 && x < img.w && y < img.h && img.data[y * img.w + x] !== TRANSPARENT) on = true;
  if (!on) return `WARNING: its front marker (${s[0]},${s[1]}) is off the drawing`;
  if (!f || Math.hypot(f[0], f[1]) < 0.5) return "";
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dot = (s[0] - cx) * f[0] + (s[1] - cy) * f[1];
  if (dot < 0) return `WARNING: its front marker is on its back half: the drawing faces ${dirWords(-f[0], -f[1]).replace("the ", "")}, its label says ${dirWords(f[0], f[1]).replace("the ", "")}`;
  return "front marker agrees";
}
