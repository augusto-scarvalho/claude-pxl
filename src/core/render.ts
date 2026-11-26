// Derived views of built images: previews for eyes, ASCII for exact checks, sheet packing.
import { type Color, TRANSPARENT, darken, pack, toHex } from "./color.ts";
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
  const s = scale, grid = s >= 6;
  // (at 1x, as a sheet's GIF of every anim is: each pixel once, half the time of the loop below)
  if (s === 1) return checker(new Img(img.w, img.h, img.data.slice()));
  const o = new Img(img.w * s, img.h * s);
  // (a source pixel's color worked out once a row, and a row the same as the one above it, past a grid line, copied)
  for (let y = 0; y < o.h; y++) {
    const sy = Math.floor(y / s), at = y * o.w, gy = grid && y % s === 0, my = gy && sy % 8 === 0;
    if (y % s > (grid ? 1 : 0)) { o.data.copyWithin(at, at - o.w, at); continue; }
    for (let sx = 0; sx < img.w; sx++) {
      let c: Color = img.data[sy * img.w + sx];
      if (c === TRANSPARENT || (c & 255) === 0) c = (sx + sy) % 2 === 0 ? LIGHT : DARK;
      for (let k = 0, x = at + sx * s; k < s; k++, x++) o.data[x] = grid && (k === 0 || gy) ? darken(c, (k === 0 && sx % 8 === 0) || my ? 0.45 : 0.18) : c;
    }
  }
  return o;
}

/** preview() at 1x made in place, over the rectangles given ([x, y, w, h]; else all of it): the checker where a pixel is clear. */
export function checker(img: Img, rects: number[][] = [[0, 0, img.w, img.h]]): Img {
  for (const [x0, y0, w, h] of rects)
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0, i = y * img.w + x; x < x0 + w; x++, i++) { const c = img.data[i]; if (c === TRANSPARENT || (c & 255) === 0) img.data[i] = (x + y) & 1 ? DARK : LIGHT; }
  return img;
}

/** The image repeated nx by ny times: how a seamless tile looks laid out (seams show). */
export function tiled(img: Img, nx: number, ny: number): Img {
  const o = new Img(img.w * nx, img.h * ny);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) o.blit(img, x * img.w, y * img.h);
  return o;
}

/** Shared window + x/y ruler helper for ascii() and asciiParts(). */
function asciiWindow(img: Img, opts?: { anchor?: boolean; trim?: boolean; at?: [number, number, number, number] }) {
  let x0 = 0, y0 = 0, x1 = img.w, y1 = img.h;
  const b = (opts?.anchor || opts?.trim) && !opts?.at ? img.bounds() : null;
  if (opts?.at) {
    x0 = Math.max(0, Math.min(img.w, opts.at[0]));
    y0 = Math.max(0, Math.min(img.h, opts.at[1]));
    x1 = Math.max(x0, Math.min(img.w, opts.at[0] + opts.at[2]));
    y1 = Math.max(y0, Math.min(img.h, opts.at[1] + opts.at[3]));
  } else if (b) {
    x0 = b.x; y0 = b.y; x1 = b.x + b.w; y1 = b.y + b.h;
  } else if (opts?.trim && !opts?.anchor) {
    return { x0: 0, y0: 0, x1: 0, y1: 0, ay: 0, header: [`(empty ${img.w}x${img.h})`] };
  }
  const ax = opts?.anchor && img.pivot ? Math.floor(img.pivot[0]) : 0, ay = opts?.anchor && img.pivot ? Math.floor(img.pivot[1]) : 0;
  const header: string[] = [];
  if (opts?.anchor) {
    const pv = img.pivot ? `[${img.pivot[0]}, ${img.pivot[1]}]` : "none";
    if (opts.at) header.push(`region: ${x0},${y0} ${x1 - x0}x${y1 - y0}  pivot: ${pv}  rel: x=${x0 - ax}..${x1 - 1 - ax}, y=${y0 - ay}..${y1 - 1 - ay}`);
    else header.push(b ? `bounds: ${b.x},${b.y} ${b.w}x${b.h}  pivot: ${pv}  rel: x=${x0 - ax}..${x1 - 1 - ax}, y=${y0 - ay}..${y1 - 1 - ay}` : `(empty ${img.w}x${img.h}, pivot: ${pv})`);
    const xs = Array.from({ length: x1 - x0 }, (_, i) => x0 + i - ax);
    if (xs.some((v) => v < 0)) header.push("    " + xs.map((v) => (v < 0 ? "-" : " ")).join(""));
    if (xs.some((v) => Math.abs(v) >= 100)) header.push("    " + xs.map((v) => (Math.abs(v) >= 100 ? String(Math.floor(Math.abs(v) / 100) % 10) : " ")).join(""));
    if (xs.some((v) => Math.abs(v) >= 10)) header.push("    " + xs.map((v) => (Math.abs(v) >= 10 ? String(Math.floor(Math.abs(v) / 10) % 10) : " ")).join(""));
    header.push("    " + xs.map((v) => String(Math.abs(v) % 10)).join(""));
  } else {
    if (opts?.trim && b) header.push(`bounds: ${b.x},${b.y} ${b.w}x${b.h} (of ${img.w}x${img.h})`);
    if (x1 > 100) header.push("    " + Array.from({ length: x1 - x0 }, (_, i) => { const x = x0 + i; return x % 100 === 0 || (i === 0 && x >= 100) ? String(Math.floor(x / 100) % 10) : " "; }).join(""));
    if (x1 > 10 || x0 > 0) header.push("    " + Array.from({ length: x1 - x0 }, (_, i) => { const x = x0 + i; return x % 10 === 0 || (i === 0 && x0 > 0 && x >= 10) ? String(Math.floor(x / 10) % 10) : " "; }).join(""));
    header.push("    " + Array.from({ length: x1 - x0 }, (_, i) => String((x0 + i) % 10)).join(""));
  }
  return { x0, y0, x1, y1, ay, header };
}

/** Text dump with x/y rulers; colors shown as palette keys ("." transparent), one the palette hasn't (a swap's) as a key said under it. With `anchor: true`, crops tightly to opaque bounds and numbers axes relative to the pivot. With `trim: true`, crops tightly while keeping absolute canvas coordinates. With `at`, crops to [x, y, w, h]. */
export function ascii(img: Img, pal: Palette, swap?: Record<string, unknown>, opts?: { anchor?: boolean; trim?: boolean; at?: [number, number, number, number] }): string {
  const { x0, y0, x1, y1, ay, header } = asciiWindow(img, opts);
  const rev = pal.reverse(), extra: string[] = [], drawn = new Set<Color>();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) drawn.add(img.data[y * img.w + x]);
  // colors the palette hasn't (a swap's): the key the swap gave this color, when that key's own color isn't
  // drawn here, else a key the palette hasn't; each said under the grid with its color
  const used = new Set([...drawn].filter((c) => rev.has(c)).map((c) => rev.get(c)!)), to = (v: unknown) => { try { return pal.resolve(v as string); } catch { return undefined; } };
  for (const c of drawn) {
    if (c === TRANSPARENT || rev.has(c)) continue;
    const k = Object.entries(swap ?? {}).find(([k, v]) => !used.has(k) && to(v) === c)?.[0] ?? [..."0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"].find((f) => !pal.keys.has(f) && !used.has(f));
    if (k === undefined) continue;
    rev.set(c, k);
    used.add(k);
    extra.push(`${k} ${toHex(c)}`);
  }
  const lines = [...header];
  for (let y = y0; y < y1; y++) {
    let row = String(y - ay).padStart(3) + " ";
    for (let x = x0; x < x1; x++) {
      const c = img.data[y * img.w + x];
      row += c === TRANSPARENT ? "." : rev.get(c) ?? "?";
    }
    lines.push(row);
  }
  if (extra.length) lines.push(`not in the palette (a swap's): ${extra.join(", ")}`);
  return lines.join("\n");
}

const PART_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Text dump of 3D part IDs (`img.parts`) with x/y rulers and per-part pixel counts ("." transparent, "#" opaque unparted/outline). */
export function asciiParts(img: Img, opts?: { anchor?: boolean; trim?: boolean; at?: [number, number, number, number] }): string {
  if (!img.parts) return `(no 3D part map on this ${img.w}x${img.h} image — parts are recorded by surface(), voxels(), volume(), splats(), decal(), rig3d() and turnaround())`;
  const { x0, y0, x1, y1, ay, header } = asciiWindow(img, opts);
  const { ids, names } = img.parts;
  const counts = new Map<number, number>();
  let unparted = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = y * img.w + x;
      if (img.data[i] === TRANSPARENT) continue;
      const pk = ids[i];
      if (pk < 0) unparted++;
      else counts.set(pk, (counts.get(pk) ?? 0) + 1);
    }
  const order = [...counts.entries()].sort((a, b) => b[1] - a[1] || (names[a[0]] ?? "").localeCompare(names[b[0]] ?? ""));
  const used = new Set<string>(), chOf = new Map<number, string>();
  for (const [id] of order) {
    const nm = names[id] ?? String(id);
    let ch = [...nm].find((c) => PART_CHARS.includes(c) && !used.has(c));
    ch ??= [...PART_CHARS].find((c) => !used.has(c)) ?? "?";
    used.add(ch);
    chOf.set(id, ch);
  }
  const lines = [...header];
  for (let y = y0; y < y1; y++) {
    let row = String(y - ay).padStart(3) + " ";
    for (let x = x0; x < x1; x++) {
      const i = y * img.w + x;
      if (img.data[i] === TRANSPARENT) row += ".";
      else { const pk = ids[i]; row += pk < 0 ? "#" : chOf.get(pk) ?? "?"; }
    }
    lines.push(row);
  }
  const legend = order.map(([id, n]) => `${chOf.get(id)}=${names[id] ?? id} (${n}px)`);
  if (unparted) legend.push(`#=unparted/outline (${unparted}px)`);
  lines.push(legend.length ? `parts: ${legend.join(", ")}` : "parts: (none opaque)");
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
  /** 0-based column and row in the packed sheet. */
  col?: number;
  row?: number;
  /** Animation frames: duration in ms. */
  ms?: number;
}

export interface SheetJsonOpts {
  format?: "hash" | "array" | "grid";
  scale?: number;
  pad?: number;
  extrude?: number;
  normalMap?: string;
  emissionMap?: string;
}

/** A named run of animation frames in a sheet (Aseprite "frameTags"). */
export interface FrameTag {
  name: string;
  from: number;
  to: number;
  direction?: "forward" | "reverse" | "pingpong";
}

/**
 * Every animation of a sheet playing at once, each in a cell of its own (a grid near square), at its
 * own timing and in its own direction, their pivots (else their bottom middles) on one line: frames of
 * one clock, `step` ms apart (the frames' common divisor, 20 ms at least), as long as the longest loop
 * (6 s at most). For a sheet's preview. Made a frame at a time over one sheet, an anim drawn again only when it
 * steps: the next frame draws over the one given, which says where it changed (`changed`: for each anim that stepped,
 * the box of its frame before and this one, [x, y, w, h]; none on the first), for an encoder to look only there.
 */
export function* playAll(tags: FrameTag[], items: { img: Img; ms?: number }[]): Generator<{ img: Img; ms: number; changed?: number[][] }> {
  const anims = tags.map((g) => {
    const fr = items.slice(g.from, g.to + 1), n = fr.length;
    const order = g.direction === "reverse" ? fr.map((_, i) => n - 1 - i) : g.direction === "pingpong" && n > 2 ? [...fr.keys(), ...fr.slice(1, -1).map((_, i) => n - 2 - i)] : [...fr.keys()];
    return order.map((i) => ({ img: fr[i].img, ms: Math.max(1, Math.round(fr[i].ms ?? 100)) }));
  });
  const imgs = anims.flat().map((f) => f.img), px = (im: Img) => im.pivot ? im.pivot[0] : im.w / 2, py = (im: Img) => im.pivot ? im.pivot[1] : im.h;
  // the cell: room left and right of the pivot, above and below it, for every frame
  const left = Math.ceil(Math.max(...imgs.map(px))), right = Math.ceil(Math.max(...imgs.map((im) => im.w - px(im))));
  const up = Math.ceil(Math.max(...imgs.map(py))), down = Math.ceil(Math.max(...imgs.map((im) => im.h - py(im))));
  const cw = left + right + 2, ch = up + down + 2, cols = Math.max(1, Math.min(anims.length, Math.round(Math.sqrt((anims.length * ch) / cw)))), rows = Math.ceil(anims.length / cols);
  const loops = anims.map((a) => a.reduce((s, f) => s + f.ms, 0));
  const step = Math.max(20, anims.flat().map((f) => f.ms).reduce((a, b) => { while (b) [a, b] = [b, a % b]; return a; }));
  const length = Math.min(6000, Math.max(...loops)), sheet = new Img(cols * cw, rows * ch), shown: Img[] = [], drawn: number[][] = [];
  for (let t = 0; t < length; t += step) {
    const changed: number[][] = [];
    anims.forEach((a, k) => {
      let at = t % loops[k], f = a[0];
      for (const g of a) { if (at < g.ms) { f = g; break; } at -= g.ms; }
      if (shown[k] === f.img) return;
      // what the frame before covered cleared and this one drawn (its pixels only: what normals a frame has aren't
      // shown, and drawn they took most of the time); the box of the two changed
      const o = drawn[k], r = [(k % cols) * cw + 1 + left - Math.round(px(f.img)), Math.floor(k / cols) * ch + 1 + up - Math.round(py(f.img)), f.img.w, f.img.h];
      if (o) for (let y = o[1]; y < o[1] + o[3]; y++) sheet.data.fill(TRANSPARENT, y * sheet.w + o[0], y * sheet.w + o[0] + o[2]);
      sheet.blit(new Img(f.img.w, f.img.h, f.img.data), r[0], r[1]);
      const x = Math.min(r[0], o?.[0] ?? r[0]), y = Math.min(r[1], o?.[1] ?? r[1]);
      changed.push([x, y, Math.max(r[0] + r[2], o ? o[0] + o[2] : 0) - x, Math.max(r[1] + r[3], o ? o[1] + o[3] : 0) - y]);
      shown[k] = f.img;
      drawn[k] = r;
    });
    yield { img: sheet, ms: step, changed: t ? changed : undefined };
  }
}

/**
 * Shelf packing: `cols` frames per row, `pad` px between them. `extrude` repeats each frame's edge
 * pixels that many px outward (the frame rect stays the same), so engines that filter or round
 * texture coordinates bleed the frame's own colors instead of a neighbour's.
 */
export function packSheet(items: { name: string; img: Img; ms?: number }[], cols?: number, pad = 0, extrude = 0, newRowAt?: Set<number>): { sheet: Img; frames: SheetFrame[] } {
  if (!items.length) throw new Error("sheet is empty");
  if (!(Number.isInteger(extrude) && extrude >= 0)) throw new Error(`extrude must be a whole number of px >= 0, got ${extrude}`);
  // (`newRowAt`: items that start a row of their own, each animation's first frame with rows: "tag")
  const perRow = cols ?? (newRowAt ? Infinity : Math.ceil(Math.sqrt(items.length)));
  const frames: SheetFrame[] = [], e = extrude;
  let x = 0, y = 0, rowH = 0, W = 0, col = 0, row = 0;
  items.forEach((it, i) => {
    if (i > 0 && (col === perRow || newRowAt?.has(i))) { x = 0; y += rowH + pad; rowH = 0; col = 0; row++; }
    frames.push({ ...it, x: x + e, y: y + e, col, row });
    col++;
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
 * Sheet manifest JSON: TexturePacker/Aseprite "hash" (default) or "array", or a row/column "grid"
 * manifest for uniform sprite-grid loaders. Animation frames add `duration` (ms) and `frameTags` /
 * `animations`; a frame with boxes, data or sockets exports them in its own pixel coordinates;
 * `more` merges into `meta`.
 */
export function sheetJson(
  image: string,
  sheet: Img,
  frames: SheetFrame[],
  tags: FrameTag[] = [],
  more: Record<string, unknown> = {},
  opts: SheetJsonOpts = {},
): string {
  const fmt = opts.format ?? "hash", scale = opts.scale ?? 1;
  const boxesOf = (img: Img) => img.boxes && Object.fromEntries(Object.entries(img.boxes).map(([k, bs]) => [k, bs.map(([x, y, w, h]) => ({ x, y, w, h }))]));
  const socketsOf = (img: Img) => img.sockets && Object.fromEntries(Object.entries(img.sockets).map(([k, [x, y]]) => [k, { x: +x.toFixed(2), y: +y.toFixed(2) }]));
  const slices = frames.flatMap((f, i) => {
    if (!f.img.slice) return [];
    const [l, t, r, b] = f.img.slice, { w, h } = f.img;
    return [{ name: f.name, color: "#0000ffff", keys: [{ frame: i, bounds: { x: 0, y: 0, w, h }, center: { x: l, y: t, w: w - l - r, h: h - t - b } }] }];
  });
  if (fmt === "grid") {
    const cols = frames.reduce((m, f) => Math.max(m, (f.col ?? 0) + 1), 0);
    const rows = frames.reduce((m, f) => Math.max(m, (f.row ?? 0) + 1), 0);
    const w0 = frames[0]?.img.w, h0 = frames[0]?.img.h;
    const uniform = frames.length > 0 && frames.every((f) => f.img.w === w0 && f.img.h === h0);
    const animations = tags.map((t) => {
      const slice = frames.slice(t.from, t.to + 1), durations = slice.map((f) => f.ms ?? 0);
      return {
        name: t.name,
        row: slice[0]?.row ?? 0,
        from: t.from,
        to: t.to,
        frames: slice.length,
        direction: t.direction ?? "forward",
        durations,
        totalMs: durations.reduce((a, b) => a + b, 0),
      };
    });
    const gridFrames = frames.map((f, index) => {
      const { w, h } = f.img, boxes = boxesOf(f.img), sockets = socketsOf(f.img);
      return {
        name: f.name,
        index,
        col: f.col ?? index,
        row: f.row ?? 0,
        x: f.x, y: f.y, w, h,
        ...(f.ms !== undefined ? { duration: f.ms } : {}),
        ...(f.img.pivot ? {
          pivot: { x: +f.img.pivot[0].toFixed(2), y: +f.img.pivot[1].toFixed(2) },
          pivotNorm: { x: +(f.img.pivot[0] / w).toFixed(4), y: +(f.img.pivot[1] / h).toFixed(4) },
        } : {}),
        ...(sockets ? { sockets } : {}),
        ...(boxes ? { boxes } : {}),
        ...(f.img.info ? { data: f.img.info } : {}),
      };
    });
    const out: Record<string, unknown> = {
      app: "pxl",
      format: "grid",
      image,
      ...(opts.normalMap ? { normalMap: opts.normalMap } : {}),
      ...(opts.emissionMap ? { emissionMap: opts.emissionMap } : {}),
      size: { w: sheet.w, h: sheet.h },
      scale,
      ...(uniform ? { cell: { w: w0, h: h0 } } : {}),
      pad: opts.pad ?? 0,
      extrude: opts.extrude ?? 0,
      cols,
      rows,
      ...(animations.length ? { animations } : {}),
      frames: gridFrames,
      ...(slices.length ? { slices } : {}),
      ...(Object.keys(more).length ? { meta: more } : {}),
    };
    return JSON.stringify(out, null, 1) + "\n";
  }
  const entry = (f: SheetFrame) => {
    const { w, h } = f.img, boxes = boxesOf(f.img), sockets = socketsOf(f.img);
    return {
      frame: { x: f.x, y: f.y, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h },
      ...(f.ms !== undefined ? { duration: f.ms } : {}),
      // TexturePacker convention: normalized, (0.5, 1) = bottom center.
      ...(f.img.pivot ? { pivot: { x: +(f.img.pivot[0] / w).toFixed(4), y: +(f.img.pivot[1] / h).toFixed(4) } } : {}),
      // a fighter's hit and hurt boxes (c.setBox), in the frame's own px, and its data (c.setData)
      ...(boxes ? { boxes } : {}),
      ...(f.img.info ? { data: f.img.info } : {}),
      // named points (a hand, a muzzle) in the frame's own px, as the boxes
      ...(sockets ? { sockets } : {}),
    };
  };
  const meta: Record<string, unknown> = {
    app: "pxl", image, format: "RGBA8888", size: { w: sheet.w, h: sheet.h }, scale: String(scale),
    ...(opts.normalMap ? { normalMap: opts.normalMap } : {}),
    ...(opts.emissionMap ? { emissionMap: opts.emissionMap } : {}),
    ...more,
  };
  if (tags.length) meta.frameTags = tags.map((t) => ({ ...t, direction: t.direction ?? "forward" }));
  if (slices.length) meta.slices = slices;
  if (fmt === "array") {
    return JSON.stringify({ frames: frames.map((f) => ({ filename: f.name, ...entry(f) })), meta }, null, 1) + "\n";
  }
  const out: Record<string, unknown> = {};
  for (const f of frames) out[f.name] = entry(f);
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

/** Each row's opaque runs and width in one picture: a reference measured on its own (chin, shoulders, hands, soles). */
export function rowExtents(img: Img): string {
  const out = [`row  ${"opaque".padEnd(22)} width`];
  let top = -1, bottom = -1;
  for (let y = 0; y < img.h; y++) {
    const r = rowRuns(img, y);
    if (!r.text) continue;
    if (top < 0) top = y;
    bottom = y;
    out.push(`${String(y).padStart(3)}  ${r.text.padEnd(22)} ${r.r! - r.l! + 1}`);
  }
  out.push("", top < 0 ? "nothing opaque" : `opaque from row ${top} to ${bottom}: ${bottom - top + 1} rows`);
  return out.join("\n");
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

const KEY_POOL = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Pixel-by-pixel color diff between `img` (left) and `ref` (right, placed at ox, oy in `img`'s coordinates):
 * changed count + bounding box, side-by-side ASCII (`LEFT | RIGHT | DIFF`, where DIFF shows `.` unchanged,
 * `-` erased to transparent, or the right color key), and a color hex legend.
 */
export function comparePixels(
  img: Img,
  ref: Img,
  opts?: { ox?: number; oy?: number; at?: [number, number, number, number]; pal?: Palette; swap?: Record<string, unknown> },
): string {
  const ox = opts?.ox ?? 0, oy = opts?.oy ?? 0;
  let x0: number, y0: number, x1: number, y1: number;
  if (opts?.at) {
    [x0, y0] = opts.at;
    x1 = x0 + opts.at[2];
    y1 = y0 + opts.at[3];
  } else {
    const loX = Math.min(0, ox), hiX = Math.max(img.w, ref.w + ox), loY = Math.min(0, oy), hiY = Math.max(img.h, ref.h + oy);
    x0 = hiX; y0 = hiY; x1 = loX; y1 = loY;
    for (let y = loY; y < hiY; y++)
      for (let x = loX; x < hiX; x++)
        if (img.get(x, y) !== TRANSPARENT || ref.get(x - ox, y - oy) !== TRANSPARENT) {
          if (x < x0) x0 = x;
          if (x + 1 > x1) x1 = x + 1;
          if (y < y0) y0 = y;
          if (y + 1 > y1) y1 = y + 1;
        }
    if (x0 >= x1 || y0 >= y1) return "identical (both empty)";
  }
  let diffCount = 0, added = 0, removed = 0, recolored = 0;
  let dx0 = Infinity, dy0 = Infinity, dx1 = -Infinity, dy1 = -Infinity;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const a = img.get(x, y), b = ref.get(x - ox, y - oy);
      if (a === b) continue;
      diffCount++;
      if (a === TRANSPARENT) added++;
      else if (b === TRANSPARENT) removed++;
      else recolored++;
      if (x < dx0) dx0 = x;
      if (x > dx1) dx1 = x;
      if (y < dy0) dy0 = y;
      if (y > dy1) dy1 = y;
    }
  if (!diffCount) return `identical (0 pixels differ in ${x1 - x0}x${y1 - y0})`;
  // Focus on the diff region when comparing large sheets without an explicit --at window
  let rx0 = x0, ry0 = y0, rx1 = x1, ry1 = y1, cropped = false;
  if (!opts?.at && (x1 - x0 > 48 || y1 - y0 > 48)) {
    rx0 = Math.max(x0, dx0 - 2); rx1 = Math.min(x1, dx1 + 3);
    ry0 = Math.max(y0, dy0 - 2); ry1 = Math.min(y1, dy1 + 3);
    cropped = rx0 !== x0 || rx1 !== x1 || ry0 !== y0 || ry1 !== y1;
  }
  const rev = opts?.pal ? opts.pal.reverse() : new Map<Color, string>(), drawn = new Set<Color>(), diffCols = new Set<Color>();
  for (let y = ry0; y < ry1; y++)
    for (let x = rx0; x < rx1; x++) {
      const a = img.get(x, y), b = ref.get(x - ox, y - oy);
      if (a !== TRANSPARENT) drawn.add(a);
      if (b !== TRANSPARENT) drawn.add(b);
      if (a !== b) { if (a !== TRANSPARENT) diffCols.add(a); if (b !== TRANSPARENT) diffCols.add(b); }
    }
  const used = new Set([...drawn].filter((c) => rev.has(c)).map((c) => rev.get(c)!));
  const to = (v: unknown) => { try { return opts?.pal?.resolve(v as string); } catch { return undefined; } };
  for (const c of drawn) {
    if (rev.has(c)) continue;
    const k = Object.entries(opts?.swap ?? {}).find(([k, v]) => !used.has(k) && to(v) === c)?.[0]
      ?? [...KEY_POOL].find((f) => !(opts?.pal?.keys.has(f)) && !used.has(f))
      ?? [...KEY_POOL].find((f) => !used.has(f));
    if (k === undefined) continue;
    rev.set(c, k);
    used.add(k);
  }
  const ch = (c: Color) => (c === TRANSPARENT ? "." : rev.get(c) ?? "?");
  const w = rx1 - rx0, padW = Math.max(w, 5);
  const ones = Array.from({ length: w }, (_, i) => String(Math.abs(rx0 + i) % 10)).join("").padEnd(padW);
  const lines = [
    `${diffCount} pixels differ in ${dx0},${dy0} ${dx1 - dx0 + 1}x${dy1 - dy0 + 1} (+${added} added, -${removed} removed, ~${recolored} recolored)`,
  ];
  if (cropped) lines.push(`(showing ${rx0},${ry0} ${rx1 - rx0}x${ry1 - ry0} around diffs; pass --at x,y,w,h for any region)`);
  lines.push(`     ${"LEFT".padEnd(padW)} | ${"RIGHT".padEnd(padW)} | DIFF`);
  lines.push(`     ${ones} | ${ones} | ${ones}`);
  for (let y = ry0; y < ry1; y++) {
    let l = "", r = "", d = "";
    for (let x = rx0; x < rx1; x++) {
      const a = img.get(x, y), b = ref.get(x - ox, y - oy);
      l += ch(a);
      r += ch(b);
      d += a === b ? "." : b === TRANSPARENT ? "-" : ch(b);
    }
    lines.push(`${String(y).padStart(4)} ${l.padEnd(padW)} | ${r.padEnd(padW)} | ${d}`);
  }
  const legendCols = drawn.size <= 24 ? [...drawn] : [...diffCols];
  if (legendCols.length) lines.push(`colors: ${legendCols.map((c) => `${ch(c)}=${toHex(c)}`).join(", ")}`);
  return lines.join("\n");
}
