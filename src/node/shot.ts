// pxl shot: frames of an asset, cropped, side by side, enlarged; under another version of the file
// for a before/after, and the pixels that changed.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import type { Project } from "../core/project.ts";
import { Img } from "../core/image.ts";
import { TRANSPARENT } from "../core/color.ts";
import { PxError } from "../core/errors.ts";

/** Frame n of an asset's loop, as `frames()` numbers them (a scene: each step of its clock): its time. */
export function frameTime(p: Project, name: string, n: number): number {
  const tl = p.timeline(name);
  const count = !tl ? 1 : tl.durations ? tl.durations.length : Math.max(1, Math.round(tl.loop / tl.step));
  if (!Number.isInteger(n) || n < 0 || n >= count) throw new PxError(`${name} has ${count} frame${count > 1 ? "s" : ""} (0-${count - 1}), not ${n}`);
  if (!tl) return 0;
  return tl.durations ? tl.durations.slice(0, n).reduce((a, b) => a + b, 0) : n * tl.step;
}

const GAP = 2, GAP_C = 0x1b1b22ff, EMPTY = 0x4a4a55ff;

/** The frames side by side (gaps between), cropped to `at`; transparent shows as a flat gray. */
export function shotRow(p: Project, name: string, frames: number[], at?: number[]): Img {
  const imgs = frames.map((f) => p.build(name, 0, frameTime(p, name, f)).img);
  const [x0, y0, w, h] = at ?? [0, 0, imgs[0].w, imgs[0].h];
  const row = new Img(imgs.length * (w + GAP) - GAP, h).fill(GAP_C);
  imgs.forEach((im, i) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x0 + x, sy = y0 + y;
      const c = sx < im.w && sy < im.h && sx >= 0 && sy >= 0 ? im.data[sy * im.w + sx] : TRANSPARENT;
      row.data[y * row.w + i * (w + GAP) + x] = c === TRANSPARENT ? EMPTY : c;
    }
  });
  return row;
}

/** `now` grayed, with every pixel that differs from `was` in red. */
export function diffRow(was: Img, now: Img): { img: Img; changed: number } {
  const out = new Img(now.w, now.h);
  let changed = 0;
  for (let i = 0; i < now.data.length; i++) {
    const c = now.data[i], g = Math.round((((c >>> 24) & 255) + ((c >>> 16) & 255) + ((c >>> 8) & 255)) / 3 * 0.5 + 40);
    const diff = i < was.data.length && was.data[i] !== c && c !== GAP_C;
    if (diff) changed++;
    out.data[i] = diff ? 0xff3030ff : ((g << 24) | (g << 16) | (g << 8) | 255) >>> 0;
  }
  return { img: out, changed };
}

/**
 * What changed between two shots of the same frames and region: per frame, how many pixels and the
 * box around them, in the asset's coordinates (so an edit that did nothing, or hit the wrong place, shows).
 */
export function shotChanges(was: Img, now: Img, frames: number[], at?: number[]): string {
  if (was.w !== now.w || was.h !== now.h) return `size ${was.w}x${was.h} -> ${now.w}x${now.h}`;
  const w = (now.w + GAP) / frames.length - GAP, [ox, oy] = at ?? [0, 0];
  return frames.map((f, i) => {
    let n = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < now.h; y++) for (let x = 0; x < w; x++) {
      const k = y * now.w + i * (w + GAP) + x;
      if (was.data[k] === now.data[k]) continue;
      n++;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    const what = n ? `${n} px changed in ${ox + x0},${oy + y0} ${x1 - x0 + 1}x${y1 - y0 + 1}` : "no change";
    return frames.length > 1 ? `frame ${f}: ${what}` : what;
  }).join("; ");
}

/** Rows stacked, a gap between. */
export function stack(rows: Img[]): Img {
  const w = Math.max(...rows.map((r) => r.w)), h = rows.reduce((s, r) => s + r.h, 0) + GAP * (rows.length - 1);
  const out = new Img(w, h).fill(GAP_C);
  let y = 0;
  for (const r of rows) { out.blit(r, 0, y); y += r.h + GAP; }
  return out;
}

/**
 * Another version of an art file to load: a path, or a git revision (the file as it was there,
 * written next to it so what it includes resolves the same; the files it includes are read as they
 * are now). `done()` removes what it wrote.
 */
export function otherVersion(file: string, vs: string): { path: string; done: () => void } {
  if (existsSync(resolve(vs))) return { path: resolve(vs), done: () => {} };
  const dir = dirname(file);
  let src: string, rel = "";
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir, encoding: "utf8" }).trim();
    rel = relative(root, file).split(sep).join("/");
    src = execFileSync("git", ["show", `${vs}:${rel}`], { cwd: root, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new PxError(`--vs ${vs}: not a file here, and git has no ${rel || basename(file)} at '${vs}'`);
  }
  const path = join(dir, `._vs_${basename(file)}`);
  writeFileSync(path, src);
  return { path, done: () => rmSync(path, { force: true }) };
}
