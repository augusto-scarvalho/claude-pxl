// Writes build results to disk: PNGs, layer PNGs, sheets + JSON, previews.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PxError, didYouMean, wrap } from "../core/errors.ts";
import type { Img } from "../core/image.ts";
import type { Project } from "../core/project.ts";
import { type FrameTag, onionSheet, packSheet, preview, previewScale, sheetJson, tiled } from "../core/render.ts";
import { normalImage } from "../core/normals.ts";
import { tiledMap } from "../core/tiled.ts";
import { encodeAseprite } from "./aseprite.ts";
import { encodeGif } from "./gif.ts";
import { encodePng } from "./png.ts";

export interface OutputOptions {
  /** Only these assets/sheets (default: everything exported). */
  only?: string[];
  /** Write upscaled previews to out/_preview (default true). */
  preview?: boolean;
  /** Fixed preview scale (default: auto). */
  scale?: number;
  /** Also write each asset as an .aseprite file (layers, frames, tag, palette). */
  aseprite?: boolean;
  /** Preview GIFs keep one frame in this many, each lasting as long (long loops; default 1). */
  every?: number;
  /** Also write out/share/<name>.png (and .gif when it moves) at this whole scale: no checker, no grid, clear kept, to post. */
  share?: number;
}

/** A preview GIF past this size gets a note: a long loop enlarged makes many MB nobody opens. */
const BIG_GIF = 4e6;

export interface OutputResult {
  lines: string[];
  errors: PxError[];
  /** How long each asset took to build and write, in ms. */
  times: [string, number][];
}

function write(path: string, data: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

export function writePng(path: string, img: Img): void {
  write(path, encodePng(img));
}

/** Build and write. Each asset fails independently; errors are collected, not thrown. */
export function writeOutputs(p: Project, out: string, opts: OutputOptions = {}): OutputResult {
  const lines: string[] = [], errors: PxError[] = [], times: [string, number][] = [];
  const sheetNames = new Set(p.sheets.map((s) => s.name));
  if (opts.only)
    for (const n of opts.only)
      if (!p.assets.has(n) && !sheetNames.has(n))
        errors.push(new PxError(`unknown asset or sheet '${n}'${didYouMean(n, [...p.order, ...sheetNames])}`));

  const want = opts.only ? new Set(opts.only) : undefined;
  const prev = (name: string, img: Img): string => {
    if (opts.preview === false) return "";
    const s = opts.scale ?? previewScale(img);
    writePng(join(out, "_preview", name + ".png"), preview(img, s));
    return ` @${s}x`;
  };

  const names = want ? p.order.filter((n) => want.has(n)) : p.exported();
  for (const n of names) {
    const def = p.assets.get(n)!, t0 = performance.now();
    try {
      const b = p.build(n);
      const dir = def.kind === "scene" ? "scenes" : def.kind === "anim" ? "anims" : "sprites";
      const frames = b.anim ? p.frames(n) : [];
      let shown = b.img, info = "";
      if (def.kind === "anim") {
        // Anims: a horizontal strip of the drawn frames + Aseprite-style JSON (the tag carries the
        // direction), plus a GIF of the full playback.
        const drawn = p.drawn(n);
        const { sheet, frames: fr } = packSheet(drawn.map((f, i) => ({ name: `${n}_${i}`, img: f.img, ms: f.ms })), drawn.length);
        writePng(join(out, dir, n + ".png"), sheet);
        write(join(out, dir, n + ".json"), sheetJson(n + ".png", sheet, fr, [{ name: n, from: 0, to: fr.length - 1, direction: p.direction(n) }]));
        // previews show reference layers (guides) over each frame, like still assets do
        shown = packSheet(frames.map((f) => ({ name: "", img: f.guide ?? f.img })), frames.length, 1).sheet;
      } else {
        // Seamless tiles preview laid out 3x3 (or 3x1 / 1x3), so seams show.
        // Reference layers show in the preview only, over the art.
        const wr = def.opts.wrap, art = b.guide ?? b.img;
        shown = wr ? tiled(art, wr === "y" ? 1 : 3, wr === "x" ? 1 : 3) : art;
        writePng(join(out, dir, n + ".png"), b.img);
        if (b.img.norm) writePng(join(out, dir, n + "_n.png"), normalImage(b.img)); // for engine lights
      }
      if (frames.length) {
        write(join(out, dir, n + ".gif"), encodeGif(frames));
        const play = p.direction(n);
        info = play === "forward" ? ` (${frames.length} frames, ${b.anim!.loop}ms)` : ` (${p.drawn(n).length} frames ${play}, ${b.anim!.loop}ms)`;
      }
      if (opts.share) {
        // to post: the art itself enlarged by a whole number, nearest neighbour, nothing drawn over it
        writePng(join(out, "share", n + ".png"), (def.kind === "anim" ? packSheet(p.drawn(n).map((f, i) => ({ name: `${n}_${i}`, img: f.img })), p.drawn(n).length).sheet : b.img).scale(opts.share));
        if (frames.length) write(join(out, "share", n + ".gif"), encodeGif(frames.map((f) => ({ img: f.img.scale(opts.share!), ms: f.ms }))));
      }
      if (def.opts.layers) for (const l of b.layers) writePng(join(out, dir, n, l.name + ".png"), l.img);
      if (b.tilemaps) {
        // Tilemaps also go out as a Tiled map, with a tileset image per layer.
        const t = tiledMap(n, b.tilemaps);
        for (const { file, img } of t.images) writePng(join(out, dir, file), img);
        if (t.json) { write(join(out, dir, n + ".tmj"), t.json); info += ` + ${n}.tmj`; }
        for (const s of t.skipped) info += ` (tiled: ${s})`;
      }
      if (opts.aseprite) {
        const a = encodeAseprite(p, n);
        write(join(out, dir, n + ".aseprite"), a.data);
        info += ` + ${n}.aseprite${a.flat ? ` (one layer: ${a.flat})` : ""}`;
      }
      let pv = "";
      if (opts.preview !== false) {
        // Previews: anims show every frame side by side; anything animated also gets a GIF.
        const s = opts.scale ?? Math.max(1, Math.min(previewScale(b.img), Math.floor(2048 / shown.w)));
        writePng(join(out, "_preview", n + ".png"), preview(shown, s));
        if (frames.length) {
          const k = Math.max(1, Math.floor(opts.every ?? 1));
          const gif = encodeGif(frames.filter((_, i) => i % k === 0).map((f) => ({ img: preview(f.guide ?? f.img, s), ms: f.ms * k })));
          write(join(out, "_preview", n + ".gif"), gif);
          if (gif.length > BIG_GIF && k === 1) info += ` -- preview GIF ${(gif.length / 1e6).toFixed(1)} MB (${frames.length} frames): --every 3 keeps one frame in three`;
        }
        // Anims also get a review sheet: a motion map, then each frame over its neighbours' ghosts.
        if (def.kind === "anim" && frames.length > 1) {
          const sheet = onionSheet(frames.map((f) => f.img));
          writePng(join(out, "_preview", n + "_onion.png"), preview(sheet, opts.scale ?? Math.max(1, Math.min(previewScale(b.img), Math.floor(2048 / sheet.w)))));
        }
        pv = ` @${s}x`;
      }
      if (b.anim?.capped) info += " -- loops don't line up, cut at 60s: give the anims durations on one grid (fps 4, 5, 10 or ms in 100s; fps 6 makes 167ms frames)";
      lines.push(`${def.kind} ${n} ${b.img.w}x${b.img.h}${info}${pv}`);
    } catch (e) {
      errors.push(wrap(e));
    }
    times.push([n, performance.now() - t0]);
  }

  for (const s of p.sheets) {
    if (want && !want.has(s.name)) continue;
    try {
      // Animated entries expand to one frame each (name_0, name_1, ...) with durations and a tag.
      const items: { name: string; img: Img; ms?: number }[] = [], tags: FrameTag[] = [];
      for (const name of p.sheetNames(s)) {
        const fr = p.drawn(name);
        if (!fr.length) { items.push({ name, img: p.image(name) }); continue; }
        tags.push({ name, from: items.length, to: items.length + fr.length - 1, direction: p.direction(name) });
        fr.forEach((f, i) => items.push({ name: `${name}_${i}`, img: f.img, ms: f.ms }));
      }
      if (!items.length) throw new PxError("sheet is empty (no entries matched)");
      const { sheet, frames } = packSheet(items, s.opts.cols, s.opts.pad, s.opts.extrude);
      writePng(join(out, s.name + ".png"), sheet);
      write(join(out, s.name + ".json"), sheetJson(s.name + ".png", sheet, frames, tags));
      lines.push(`sheet ${s.name} ${sheet.w}x${sheet.h} (${frames.length} frames)${prev(s.name, sheet)}`);
    } catch (e) {
      errors.push(wrap(e).within(`sheet '${s.name}'`, s.loc));
    }
  }
  return { lines, errors, times };
}
