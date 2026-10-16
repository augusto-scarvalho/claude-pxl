// The painting log of one build, replayed step by step: what `pxl steps` prints.
import { type Color, TRANSPARENT, pack } from "./color.ts";
import { glyph } from "./font.ts";
import { Img } from "./image.ts";
import type { Trace } from "./trace.ts";

export interface Step {
  /** 1-based, in painting order. */
  n: number;
  label: string;
  loc?: string;
  /** The canvas started over at this step (the first step, or a size change such as outline). */
  fresh: boolean;
  w: number;
  h: number;
  /** Pixels this step changed (on a fresh canvas: its opaque pixels). */
  changed: number;
  /** Bounding box of the change. */
  box?: { x: number; y: number; w: number; h: number };
}

/** Replay a trace; `visit` gets each step and the image right after it (one Img, updated in place). */
export function replay(trace: Trace, visit: (s: Step, img: Img) => void): void {
  let img: Img | undefined;
  trace.frames.forEach((f, i) => {
    let changed = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    const hit = (idx: number) => {
      changed++;
      const x = idx % f.w, y = Math.floor(idx / f.w);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    };
    if (f.full) {
      img = new Img(f.w, f.h, f.full.slice());
      img.data.forEach((c, idx) => { if (c !== TRANSPARENT) hit(idx); });
    } else {
      const ch = f.changes!;
      for (let k = 0; k < ch.length; k += 2) { img!.data[ch[k]] = ch[k + 1]; hit(ch[k]); }
    }
    visit({ n: i + 1, label: f.label, loc: f.loc, fresh: !!f.full, w: f.w, h: f.h, changed,
      box: changed ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : undefined }, img!);
  });
}

/**
 * Where final-image pixel (x, y) sits on an earlier canvas of size w x h. Post-processing that
 * resizes grows or shrinks evenly (outline pads 1 on each side), so the offset is half the
 * difference; a crop isn't even, and gives undefined.
 */
export function mapPixel(x: number, y: number, final: { w: number; h: number }, w: number, h: number): number | undefined {
  const dx = final.w - w, dy = final.h - h;
  if (dx % 2 || dy % 2) return undefined;
  const px = x - dx / 2, py = y - dy / 2;
  return px >= 0 && py >= 0 && px < w && py < h ? py * w + px : undefined;
}

/** Step thumbnails in a grid, each with its step number under it. */
export function stepSheet(imgs: { n: number; img: Img }[], cols = 8): Img {
  const cw = Math.max(...imgs.map((s) => s.img.w), 12) + 2, ch = Math.max(...imgs.map((s) => s.img.h)) + 8;
  const rows = Math.ceil(imgs.length / cols), out = new Img(cw * Math.min(cols, imgs.length), ch * rows);
  const band: Color = pack(0xe8, 0xe6, 0xee), ink: Color = pack(0x22, 0x1c, 0x2b);
  imgs.forEach(({ n, img }, i) => {
    const ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch;
    out.blit(img, ox + 1, oy + 1);
    for (let y = oy + ch - 7; y < oy + ch; y++) for (let x = ox; x < ox + cw; x++) out.set(x, y, band);
    [...String(n)].forEach((d, k) => glyph(d).forEach((row, gy) => [...row].forEach((p, gx) => {
      if (p === "#") out.set(ox + 1 + k * 4 + gx, oy + ch - 6 + gy, ink);
    })));
  });
  return out;
}
