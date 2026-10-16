// Writes build results to disk: PNGs, layer PNGs, sheets + JSON, previews.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PxError, didYouMean, wrap } from "../core/errors.ts";
import type { Img } from "../core/image.ts";
import type { Project } from "../core/project.ts";
import { type FrameTag, packSheet, preview, previewScale, sheetJson, tiled } from "../core/render.ts";
import { normalImage } from "../core/normals.ts";
import { encodeGif } from "./gif.ts";
import { encodePng } from "./png.ts";

export interface OutputOptions {
  /** Only these assets/sheets (default: everything exported). */
  only?: string[];
  /** Write upscaled previews to out/_preview (default true). */
  preview?: boolean;
  /** Fixed preview scale (default: auto). */
  scale?: number;
}

export interface OutputResult {
  lines: string[];
  errors: PxError[];
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
  const lines: string[] = [], errors: PxError[] = [];
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
    const def = p.assets.get(n)!;
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
        shown = packSheet(frames.map((f) => ({ name: "", img: f.img })), frames.length, 1).sheet;
      } else {
        // Seamless tiles preview laid out 3x3 (or 3x1 / 1x3), so seams show.
        const wr = def.opts.wrap;
        if (wr) shown = tiled(b.img, wr === "y" ? 1 : 3, wr === "x" ? 1 : 3);
        writePng(join(out, dir, n + ".png"), b.img);
        if (b.img.norm) writePng(join(out, dir, n + "_n.png"), normalImage(b.img)); // for engine lights
      }
      if (frames.length) {
        write(join(out, dir, n + ".gif"), encodeGif(frames));
        const play = p.direction(n);
        info = play === "forward" ? ` (${frames.length} frames, ${b.anim!.loop}ms)` : ` (${p.drawn(n).length} frames ${play}, ${b.anim!.loop}ms)`;
      }
      if (def.opts.layers) for (const l of b.layers) writePng(join(out, dir, n, l.name + ".png"), l.img);
      let pv = "";
      if (opts.preview !== false) {
        // Previews: anims show every frame side by side; anything animated also gets a GIF.
        const s = opts.scale ?? Math.max(1, Math.min(previewScale(b.img), Math.floor(2048 / shown.w)));
        writePng(join(out, "_preview", n + ".png"), preview(shown, s));
        if (frames.length) write(join(out, "_preview", n + ".gif"), encodeGif(frames.map((f) => ({ img: preview(f.img, s), ms: f.ms }))));
        pv = ` @${s}x`;
      }
      lines.push(`${def.kind} ${n} ${b.img.w}x${b.img.h}${info}${pv}`);
    } catch (e) {
      errors.push(wrap(e));
    }
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
      const { sheet, frames } = packSheet(items, s.opts.cols, s.opts.pad);
      writePng(join(out, s.name + ".png"), sheet);
      write(join(out, s.name + ".json"), sheetJson(s.name + ".png", sheet, frames, tags));
      lines.push(`sheet ${s.name} ${sheet.w}x${sheet.h} (${frames.length} frames)${prev(s.name, sheet)}`);
    } catch (e) {
      errors.push(wrap(e).within(`sheet '${s.name}'`, s.loc));
    }
  }
  return { lines, errors };
}
