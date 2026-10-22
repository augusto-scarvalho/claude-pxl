import { TRANSPARENT } from "../src/core/color.ts";
import { PxError } from "../src/core/errors.ts";
import type { Project } from "../src/core/project.ts";
import { loadSource } from "../src/node/load.ts";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { latticeHash } from "../src/core/util.ts";
import { main } from "../src/node/cli.ts";

/** Palette prelude on line 1 (no newline), so test sources keep their own line numbers. */
export const PAL = 'use("pico8"); pal({ k: 0, r: 8, w: 7, g: 11 }); ';

/** Build `name` from source and return its pixels as palette-key rows. */
export function art(src: string, name: string, trace = false): string {
  const p = loadSource(src, "t.px.js", { trace });
  return keys(p, name);
}

export function keys(p: Project, name: string): string {
  const img = p.image(name);
  const rev = p.assets.get(name)!.pal.reverse();
  const rows: string[] = [];
  for (let y = 0; y < img.h; y++) {
    let r = "";
    for (let x = 0; x < img.w; x++) {
      const c = img.data[y * img.w + x];
      r += c === TRANSPARENT ? "." : rev.get(c) ?? "?";
    }
    rows.push(r);
  }
  return rows.join("\n");
}

/** The error thrown while loading + building `name`. */
export function failure(src: string, name?: string): PxError {
  try {
    const p = loadSource(src, "t.px.js");
    if (name) p.image(name);
  } catch (e) {
    if (e instanceof PxError) return e;
    throw new Error("expected a PxError, got " + String(e));
  }
  throw new Error("expected a failure");
}

// a 1x drawing in a handful of colors: runs of 1-3 px, a different length on each row, so no grid
export const PALETTE = [pack(30, 30, 46), pack(60, 90, 150), pack(110, 160, 220), pack(200, 120, 60), pack(240, 220, 160), pack(70, 140, 70)];
export const drawing = (w: number, h: number, seed = 1) => {
  const img = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.set(x, y, PALETTE[Math.floor(latticeHash(Math.floor(x / (1 + ((y * 7) % 3))) + seed * 101, y) * PALETTE.length)]);
  return img;
};
/** What the CLI prints for `argv`. */
export const said = async (...argv: string[]) => {
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { await main(argv); } finally { console.log = log; }
  return lines.join("\n");
};
