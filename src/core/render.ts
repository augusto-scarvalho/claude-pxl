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

/** Shelf packing: `cols` frames per row, `pad` px between them. */
export function packSheet(items: { name: string; img: Img; ms?: number }[], cols?: number, pad = 0): { sheet: Img; frames: SheetFrame[] } {
  if (!items.length) throw new Error("sheet is empty");
  const perRow = cols ?? Math.ceil(Math.sqrt(items.length));
  const frames: SheetFrame[] = [];
  let x = 0, y = 0, rowH = 0, W = 0;
  items.forEach((it, i) => {
    if (i > 0 && i % perRow === 0) { x = 0; y += rowH + pad; rowH = 0; }
    frames.push({ ...it, x, y });
    W = Math.max(W, x + it.img.w);
    x += it.img.w + pad;
    rowH = Math.max(rowH, it.img.h);
  });
  const sheet = new Img(W, y + rowH);
  for (const f of frames) sheet.blit(f.img, f.x, f.y);
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
  return JSON.stringify({ frames: out, meta }, null, 1) + "\n";
}
