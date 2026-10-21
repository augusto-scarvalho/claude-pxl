// Pictures, GIFs and videos read as frames for `pxl study`. PNG and GIF are read here; JPEG, WebP,
// BMP and video go through ffmpeg when it is on PATH (pxl needs nothing else). Each frame is brought
// down as it is read: pixel art drawn at 2x and up to its own pixels (the grid found on the first
// frame), anything else to 640 px on its long side, so a minute of video doesn't fill the memory.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { PxError } from "../core/errors.ts";
import type { Img } from "../core/image.ts";
import { type Grid, areaDown, findGrid, toNative } from "../core/vision.ts";
import { decodeGif } from "./gifread.ts";
import { decodePng } from "./png.ts";

export interface Media { frames: Img[]; ms: number[]; kind: string; drawnAt?: Grid }
export interface MediaOpts { at?: number[]; from?: number; seconds?: number; fps?: number; max?: number; px?: number }

const STILL = new Set([".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]);

export function readMedia(path: string, o: MediaOpts = {}): Media {
  const ext = extname(path).toLowerCase(), max = o.max ?? 240;
  let read: (() => Img)[], ms: number[], kind: string, cleanup = () => {};
  if (ext === ".png") { const img = decodePng(readFileSync(path)); read = [() => img]; ms = [100]; kind = "PNG"; }
  else if (ext === ".gif") {
    const g = decodeGif(readFileSync(path));
    const from = Math.floor(((o.from ?? 0) * 1000) / (g.frames[0]?.ms || 100)), part = g.frames.slice(from, o.seconds ? from + Math.ceil((o.seconds * 1000) / (g.frames[0]?.ms || 100)) : undefined);
    read = part.map((f) => () => f.img); ms = part.map((f) => f.ms);
    kind = `GIF${g.frames.length > part.length ? `, frames ${from}-${from + part.length - 1} of ${g.frames.length}` : ""}`;
  } else ({ read, ms, kind, cleanup } = viaFfmpeg(path, ext, o, max));
  try {
    if (!read.length) throw new PxError(`${path}: no frames in it`);
    // each frame: the region asked for, then down to its own pixels (or to 640 px) when it moves
    let drawnAt: Grid | undefined, shrink: ((f: Img) => Img) | null = null;
    let at = o.at ?? [];
    const frames: Img[] = [];
    for (const [i, get] of read.entries()) {
      let f = get();
      if (o.at) {
        // in the drawing's own pixels, as shot and study's positions are: a 2x picture's 10,10 is the
        // file's 20,20 (its grid read on the whole first frame)
        if (i === 0) {
          const g = findGrid(f, o.px);
          if (g.sx > 1 || g.sy > 1) {
            const [x, y, w, h] = o.at;
            at = [Math.round(g.ox + x * g.sx), Math.round(g.oy + y * g.sy), Math.round(w * g.sx), Math.round(h * g.sy)];
            if (!(w > 0 && h > 0 && at[0] + at[2] <= f.w && at[1] + at[3] <= f.h)) throw new PxError(`--at ${o.at.join(",")} isn't inside the picture, ${Math.floor(f.w / g.sx)}x${Math.floor(f.h / g.sy)} as drawn (${f.w}x${f.h} in the file, drawn at ${+g.sx.toFixed(2)}x)`);
            kind += `, the region ${o.at.join(",")} at 1x (${at.join(",")} of the file)`;
            // the whole picture's grid read the crop: a plain corner of it would find none of its own
            const cg: Grid = { sx: g.sx, sy: g.sy, ox: g.ox + x * g.sx - at[0], oy: g.oy + y * g.sy - at[1] };
            drawnAt = cg; shrink = (img) => toNative(img, cg);
          }
        }
        const [x, y, w, h] = at;
        if (!(w > 0 && h > 0 && x + w <= f.w && y + h <= f.h)) throw new PxError(`--at ${o.at.join(",")} isn't inside the ${f.w}x${f.h} picture`);
        f = f.sub(x, y, w, h);
      }
      if (i === 0 && read.length > 1 && !drawnAt) {
        const g = findGrid(f, o.px);
        if (g.sx > 1 || g.sy > 1) { drawnAt = g; shrink = (img) => toNative(img, g); }
        else if (Math.max(f.w, f.h) > 640) {
          const s = 640 / Math.max(f.w, f.h), w = Math.round(f.w * s), h = Math.round(f.h * s);
          shrink = (img) => areaDown(img, w, h); kind += `, read at ${w}x${h}`;
        }
      }
      frames.push(shrink ? shrink(f) : f);
    }
    return { frames, ms, kind, drawnAt };
  } finally { cleanup(); }
}

function viaFfmpeg(path: string, ext: string, o: MediaOpts, max: number) {
  const run = (cmd: string, args: string[]) => {
    const r = spawnSync(cmd, args, { encoding: "buffer", maxBuffer: 1 << 26 });
    if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT")
      throw new PxError(`${ext || "these"} files are read through ffmpeg, which isn't on PATH: install it (winget install Gyan.FFmpeg, brew install ffmpeg, apt install ffmpeg) or give a PNG or GIF`);
    if (r.status !== 0) throw new PxError(`ffmpeg couldn't read ${path}: ${r.stderr.toString().trim().split("\n").pop()}`);
    return r.stdout.toString();
  };
  const still = STILL.has(ext);
  let fps = 1, native = 0;
  if (!still) {
    const [a, b] = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", path]).trim().split("/").map(Number);
    native = b ? a / b : a || 30;
    fps = o.fps ?? Math.min(native, 30);
  }
  const dir = mkdtempSync(join(tmpdir(), "pxl-study-")), cleanup = () => rmSync(dir, { recursive: true, force: true });
  try {
    const args = ["-v", "error"];
    if (!still && o.from) args.push("-ss", String(o.from));
    args.push("-i", path);
    if (!still) args.push("-t", String(o.seconds ?? 8), "-vf", `fps=${fps}`);
    args.push("-frames:v", String(still ? 1 : max), join(dir, "f%05d.png"));
    run("ffmpeg", args);
  } catch (e) { cleanup(); throw e; }
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  const kind = still ? `${ext.slice(1).toUpperCase()}, through ffmpeg` : `video through ffmpeg, ${files.length} frames at ${+fps.toFixed(2)} fps${native && fps < native ? ` (of ${+native.toFixed(2)})` : ""} from ${o.from ?? 0} s`;
  return { read: files.map((f) => () => decodePng(readFileSync(join(dir, f)))), ms: files.map(() => Math.round(1000 / fps)), kind, cleanup };
}
