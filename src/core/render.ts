// Derived views of built images: previews for eyes, ASCII for exact checks, sheet packing.
import { type Color, TRANSPARENT, darken, pack } from "./color.ts";
import { Img } from "./image.ts";
import type { Palette } from "./palette.ts";

const LIGHT = pack(0xe4, 0xe4, 0xe4), DARK = pack(0xc8, 0xc8, 0xc8);

/** Auto preview scale: longest side ~768px, clamped to 1..16. */
export function previewScale(img: Img, max = 768): number {
  return Math.max(1, Math.min(16, Math.floor(max / Math.max(img.w, img.h))));
}

/**
 * Upscaled preview: checkerboard behind transparency (one check per source pixel) and,
 * at scale >= 6, a pixel grid with every 8th line darker for reading coordinates.
 */
export function preview(img: Img, scale = previewScale(img)): Img {
  const s = scale;
  const o = new Img(img.w * s, img.h * s);
  for (let y = 0; y < o.h; y++) {
    const sy = Math.floor(y / s);
    for (let x = 0; x < o.w; x++) {
      const sx = Math.floor(x / s);
      let c: Color = img.data[sy * img.w + sx];
      if (c === TRANSPARENT || (c & 255) === 0) c = (sx + sy) % 2 === 0 ? LIGHT : DARK;
      if (s >= 6 && (x % s === 0 || y % s === 0)) {
        const major = (x % s === 0 && sx % 8 === 0) || (y % s === 0 && sy % 8 === 0);
        c = darken(c, major ? 0.45 : 0.18);
      }
      o.data[y * o.w + x] = c;
    }
  }
  return o;
}

/** The image repeated nx by ny times: how a seamless tile looks laid out (seams show). */
export function tiled(img: Img, nx: number, ny: number): Img {
  const o = new Img(img.w * nx, img.h * ny);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) o.blit(img, x * img.w, y * img.h);
  return o;
}

/** Text dump with x/y rulers; colors shown as palette keys ("." transparent, "?" unknown). */
export function ascii(img: Img, pal: Palette): string {
  const rev = pal.reverse();
  const tens = "    " + Array.from({ length: img.w }, (_, x) => (x % 10 === 0 ? String(Math.floor(x / 10) % 10) : " ")).join("");
  const ones = "    " + Array.from({ length: img.w }, (_, x) => String(x % 10)).join("");
  const lines = img.w > 10 ? [tens, ones] : [ones];
  for (let y = 0; y < img.h; y++) {
    let row = String(y).padStart(3) + " ";
    for (let x = 0; x < img.w; x++) {
      const c = img.data[y * img.w + x];
      row += c === TRANSPARENT ? "." : rev.get(c) ?? "?";
    }
    lines.push(row);
  }
  return lines.join("\n");
}

/** Fixed preview colors of the onion sheet: the frame before (red), after (blue), both (purple). */
const GHOST_PREV = pack(236, 120, 120), GHOST_NEXT = pack(110, 150, 236), GHOST_BOTH = pack(176, 120, 210), MOVING = pack(96, 96, 104);

/** A hue from red (first frame) to violet (last), for the motion map. */
function frameHue(i: number, n: number): Color {
  const h = (n > 1 ? i / (n - 1) : 0) * 270, f = (k: number) => {
    const t = (k + h / 60) % 6;
    return Math.round(255 * (1 - Math.max(0, Math.min(t, 4 - t, 1))));
  };
  return pack(f(5), f(3), f(1));
}

/**
 * Review sheet for an animation, previews only. The first cell is a motion map: what stays put in
 * every frame, dimmed; what moves, gray, with the contour of each frame's moving part in its own
 * color (red first, violet last), so arcs, jitter and parts that jump read at a glance. Then each
 * frame over ghosts of the frame before it (red) and after it (blue), wrapping around, so the loop
 * seam shows in the first and last cells.
 */
export function onionSheet(frames: Img[]): Img {
  const n = frames.length, w = Math.max(...frames.map((f) => f.w)), h = Math.max(...frames.map((f) => f.h));
  const motion = new Img(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c0 = frames[0].get(x, y);
      if (c0 !== TRANSPARENT && frames.every((f) => f.get(x, y) === c0)) motion.set(x, y, darken(c0, 0.55));
    }
  // what moves: a gray body under each frame's contour in its own color (whether a pixel ever changes,
  // worked out once: asked for every frame, it made a long loop's sheet cost frames squared)
  const still = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c0 = frames[0].get(x, y); if (frames.every((g) => g.get(x, y) === c0)) still[y * w + x] = 1; }
  const moving = (f: Img, x: number, y: number) => f.get(x, y) !== TRANSPARENT && !(x >= 0 && y >= 0 && x < w && y < h && still[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (frames.some((f) => moving(f, x, y))) motion.set(x, y, MOVING);
  frames.forEach((f, i) => {
    const hue = frameHue(i, n);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (moving(f, x, y) && [[0, -1], [-1, 0], [0, 1], [1, 0]].some(([dx, dy]) => f.get(x + dx, y + dy) === TRANSPARENT)) motion.set(x, y, hue);
  });
  const cells = frames.map((f, i) => {
    const prev = frames[(i + n - 1) % n], next = frames[(i + 1) % n], o = new Img(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = f.get(x, y);
        if (c !== TRANSPARENT) { o.set(x, y, c); continue; }
        const p = prev.get(x, y) !== TRANSPARENT, q = next.get(x, y) !== TRANSPARENT;
        if (p || q) o.set(x, y, p && q ? GHOST_BOTH : p ? GHOST_PREV : GHOST_NEXT);
      }
    return o;
  });
  return packSheet([motion, ...cells].map((img) => ({ name: "", img })), n + 1, 1).sheet;
}

export interface SheetFrame {
  name: string;
  img: Img;
  x: number;
  y: number;
  /** Animation frames: duration in ms. */
  ms?: number;
}

/** A named run of animation frames in a sheet (Aseprite "frameTags"). */
export interface FrameTag {
  name: string;
  from: number;
  to: number;
  direction?: "forward" | "reverse" | "pingpong";
}

/**
 * Shelf packing: `cols` frames per row, `pad` px between them. `extrude` repeats each frame's edge
 * pixels that many px outward (the frame rect stays the same), so engines that filter or round
 * texture coordinates bleed the frame's own colors instead of a neighbour's.
 */
export function packSheet(items: { name: string; img: Img; ms?: number }[], cols?: number, pad = 0, extrude = 0): { sheet: Img; frames: SheetFrame[] } {
  if (!items.length) throw new Error("sheet is empty");
  if (!(Number.isInteger(extrude) && extrude >= 0)) throw new Error(`extrude must be a whole number of px >= 0, got ${extrude}`);
  const perRow = cols ?? Math.ceil(Math.sqrt(items.length));
  const frames: SheetFrame[] = [], e = extrude;
  let x = 0, y = 0, rowH = 0, W = 0;
  items.forEach((it, i) => {
    if (i > 0 && i % perRow === 0) { x = 0; y += rowH + pad; rowH = 0; }
    frames.push({ ...it, x: x + e, y: y + e });
    W = Math.max(W, x + it.img.w + 2 * e);
    x += it.img.w + 2 * e + pad;
    rowH = Math.max(rowH, it.img.h + 2 * e);
  });
  const sheet = new Img(W, y + rowH);
  for (const f of frames) {
    const { w, h } = f.img;
    for (let yy = -e; yy < h + e; yy++)
      for (let xx = -e; xx < w + e; xx++)
        sheet.set(f.x + xx, f.y + yy, f.img.get(Math.min(w - 1, Math.max(0, xx)), Math.min(h - 1, Math.max(0, yy))));
  }
  return { sheet, frames };
}

/**
 * TexturePacker "hash" JSON (read by Phaser, Godot importers, etc.). Animation frames add a
 * `duration` (ms) and `meta.frameTags`, as Aseprite exports them.
 */
export function sheetJson(image: string, sheet: Img, frames: SheetFrame[], tags: FrameTag[] = []): string {
  const out: Record<string, unknown> = {};
  for (const f of frames) {
    const { w, h } = f.img;
    out[f.name] = {
      frame: { x: f.x, y: f.y, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h },
      ...(f.ms !== undefined ? { duration: f.ms } : {}),
      // TexturePacker convention: normalized, (0.5, 1) = bottom center.
      ...(f.img.pivot ? { pivot: { x: +(f.img.pivot[0] / w).toFixed(4), y: +(f.img.pivot[1] / h).toFixed(4) } } : {}),
    };
  }
  const meta: Record<string, unknown> = { app: "pxl", image, format: "RGBA8888", size: { w: sheet.w, h: sheet.h }, scale: "1" };
  if (tags.length) meta.frameTags = tags.map((t) => ({ ...t, direction: t.direction ?? "forward" }));
  // 9-slice margins, as Aseprite exports slices: bounds and center in the frame's own coordinates.
  const slices = frames.flatMap((f, i) => {
    if (!f.img.slice) return [];
    const [l, t, r, b] = f.img.slice, { w, h } = f.img;
    return [{ name: f.name, color: "#0000ffff", keys: [{ frame: i, bounds: { x: 0, y: 0, w, h }, center: { x: l, y: t, w: w - l - r, h: h - t - b } }] }];
  });
  if (slices.length) meta.slices = slices;
  return JSON.stringify({ frames: out, meta }, null, 1) + "\n";
}

/** Opaque runs of a row, as "a-b c-d". */
function rowRuns(img: Img, y: number, dx = 0): { text: string; l?: number; r?: number } {
  if (y < 0 || y >= img.h) return { text: "" };
  const parts: string[] = [];
  let l: number | undefined, r: number | undefined, start = -1;
  for (let x = 0; x <= img.w; x++) {
    const solid = x < img.w && img.data[y * img.w + x] !== TRANSPARENT;
    if (solid && start < 0) start = x;
    if (!solid && start >= 0) {
      parts.push(start === x - 1 ? `${start + dx}` : `${start + dx}-${x - 1 + dx}`);
      l ??= start + dx;
      r = x - 1 + dx;
      start = -1;
    }
  }
  return { text: parts.join(" "), l, r };
}

/**
 * Row-by-row silhouette check of an asset against a reference image (placed at ox, oy in the
 * asset's coordinates): each row's opaque runs side by side and how much wider the asset is on
 * each side. Widths that differ by a pixel per side are easy to miss in a preview.
 */
export function compareSilhouettes(img: Img, ref: Img, ox = 0, oy = 0): string {
  const out = [`row  ${"reference".padEnd(22)} ${"asset".padEnd(22)} wider: left right`];
  let wider = 0, narrower = 0, same = 0, rows = 0, maxL = 0, maxR = 0, minL = 0, minR = 0;
  for (let y = Math.min(0, oy); y < Math.max(img.h, ref.h + oy); y++) {
    const a = rowRuns(img, y), b = rowRuns(ref, y - oy, ox);
    if (!a.text && !b.text) continue;
    let d = "";
    if (a.l !== undefined && b.l !== undefined) {
      const dl = b.l - a.l, dr = a.r! - b.r!;
      rows++;
      if (dl > 0 || dr > 0) wider++;
      else if (dl < 0 || dr < 0) narrower++;
      else same++;
      maxL = Math.max(maxL, dl); maxR = Math.max(maxR, dr); minL = Math.min(minL, dl); minR = Math.min(minR, dr);
      const f = (v: number) => (v > 0 ? `+${v}` : `${v}`).padStart(5);
      d = dl || dr ? `${f(dl)} ${f(dr)}` : "";
    } else d = a.text ? "  (asset only)" : "  (reference only)";
    out.push(`${String(y).padStart(3)}  ${b.text.padEnd(22)} ${a.text.padEnd(22)}${d}`);
  }
  out.push("", `${rows} rows in both: the asset is wider on ${wider} (up to +${maxL} left, +${maxR} right), narrower on ${narrower} (down to ${minL} left, ${minR} right), the same on ${same}.`);
  return out.join("\n");
}
