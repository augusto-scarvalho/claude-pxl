// Writes build results to disk: PNGs, layer PNGs, sheets + JSON, previews.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PxError, didYouMean, wrap } from "../core/errors.ts";
import type { Img } from "../core/image.ts";
import { TRANSPARENT, toHex } from "../core/color.ts";
import type { Project } from "../core/project.ts";
import { type FrameTag, onionSheet, packSheet, playAll, preview, previewScale, sheetJson, tiled } from "../core/render.ts";
import { emitImage, glows, normalImage } from "../core/normals.ts";
import { tiledMap } from "../core/tiled.ts";
import { encodeAseprite } from "./aseprite.ts";
import { encodeGif } from "./gif.ts";
import { encodePng } from "./png.ts";
import { encodeGlb, encodeObj, encodePly, encodeVox, readGlb, readObj, readPly, readVox } from "../core/files3d.ts";
import { Splats } from "../core/splats.ts";
import { type Mesh3, Voxels } from "../core/grids.ts";

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
  const sheetNames = new Set([...p.sheets.map((s) => s.name), ...p.models.map((m) => m.name)]);
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
  // a map's file (<x>_n.png, <x>_e.png) that is another's own (an asset x with normals beside an asset
  // x_n, a sheet beside a sheet x_n): an error naming both, and the map not written over it
  const folder = (k: string) => (k === "scene" ? "scenes" : k === "anim" ? "anims" : "sprites"), files = new Set(p.exported());
  const writeMap = (what: string, n: string, dir: string, suffix: "_n" | "_e", img: () => Img, loc?: string) => {
    const o = n + suffix, d = p.assets.get(o), other = dir ? d && files.has(o) && folder(d.kind) === dir && `${d.kind} '${o}'` : p.sheets.some((s) => s.name === o) && `sheet '${o}'`;
    if (other) errors.push(new PxError(`${what} '${n}': its ${suffix === "_n" ? "normal" : "emission"} map would be ${dir ? dir + "/" : ""}${o}.png, the file of ${other} too (a heading's sprite?): rename one of them; the map isn't written`, loc));
    else writePng(join(out, dir, o + ".png"), img());
  };
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
        if (drawn.some((f) => f.img.norm)) writeMap(def.kind, n, dir, "_n", () => packSheet(drawn.map((f) => ({ name: "", img: normalImage(f.img) })), drawn.length).sheet, def.loc); // laid out as the art
        if (drawn.some((f) => glows(f.img))) writeMap(def.kind, n, dir, "_e", () => packSheet(drawn.map((f) => ({ name: "", img: emitImage(f.img) })), drawn.length).sheet, def.loc);
        // previews show reference layers (guides) over each frame, like still assets do
        shown = packSheet(frames.map((f) => ({ name: "", img: f.guide ?? f.img })), frames.length, 1).sheet;
      } else {
        // Seamless tiles preview laid out 3x3 (or 3x1 / 1x3), so seams show.
        // Reference layers show in the preview only, over the art.
        const wr = def.opts.wrap, art = b.guide ?? b.img;
        shown = wr ? tiled(art, wr === "y" ? 1 : 3, wr === "x" ? 1 : 3) : art;
        writePng(join(out, dir, n + ".png"), b.img);
        // a frozen cell with no PNG yet: its live render, written where it is read from next time
        if (def.freeze) { writePng(def.freeze, b.img); info += ` (frozen: wrote ${def.freeze})`; }
        if (b.img.norm) writeMap(def.kind, n, dir, "_n", () => normalImage(b.img), def.loc); // for engine lights
        if (glows(b.img)) writeMap(def.kind, n, dir, "_e", () => emitImage(b.img), def.loc);
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
      if (b.anim?.long) info += ` -- ${b.anim.long}`;
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
      if (s.opts.rows !== undefined && s.opts.rows !== "tag") throw new PxError(`rows can only be "tag" (each animation on a row of its own), got ${JSON.stringify(s.opts.rows)}`);
      const rows = s.opts.rows === "tag" ? new Set(tags.flatMap((g) => [g.from, g.to + 1])) : undefined;
      const { sheet, frames } = packSheet(items, s.opts.cols, s.opts.pad, s.opts.extrude, rows);
      writePng(join(out, s.name + ".png"), sheet);
      // palette slots: the sheet's colors as they first appear, and each slot's in the same order (a
      // palette swap's lookup), in the JSON and as .hex files beside it (rrggbb: alpha stays the art's)
      const cs = s.slots && [...new Set(sheet.data)].filter((c) => c !== TRANSPARENT);
      const pals = cs && { palette: cs.map(toHex), slots: Object.fromEntries(s.slots!.map(([n, m]) => [n, cs.map((c) => toHex(m.get(c) ?? c))])) };
      write(join(out, s.name + ".json"), sheetJson(s.name + ".png", sheet, frames, tags, pals ?? {}));
      if (pals) for (const [n, l] of [["", pals.palette], ...Object.entries(pals.slots)] as [string, string[]][]) write(join(out, `${s.name}${n && "." + n}.hex`), l.map((h) => h.slice(1, 7) + "\n").join(""));
      // the normal maps in the same rectangles, for engine lights (the art's json serves both)
      if (items.some((it) => it.img.norm)) writeMap("sheet", s.name, "", "_n", () => packSheet(items.map((it) => ({ ...it, img: normalImage(it.img) })), s.opts.cols, s.opts.pad, s.opts.extrude, rows).sheet, s.loc);
      if (items.some((it) => glows(it.img))) writeMap("sheet", s.name, "", "_e", () => packSheet(items.map((it) => ({ ...it, img: emitImage(it.img) })), s.opts.cols, s.opts.pad, s.opts.extrude, rows).sheet, s.loc);
      lines.push(`sheet ${s.name} ${sheet.w}x${sheet.h} (${frames.length} frames)${prev(s.name, sheet)}`);
      // a sheet of animations also plays them all at once in its preview, each in a cell of its own at
      // its own timing (a character's moves side by side, to judge them together)
      if (tags.length && opts.preview !== false) {
        const play = playAll(tags, items), k = opts.scale ?? previewScale(play[0].img);
        write(join(out, "_preview", s.name + ".gif"), encodeGif(play.map((f) => ({ img: preview(f.img, k), ms: f.ms }))));
      }
    } catch (e) {
      errors.push(wrap(e).within(`sheet '${s.name}'`, s.loc));
    }
  }
  // 3D files, each read back to say what it holds
  for (const m of p.models) {
    if (want && !want.has(m.name)) continue;
    try {
      const kb = (b: { length: number }) => `${(b.length / 1024).toFixed(1)} KB`;
      // the moments of a loop (one, unless made by a function of the clock), each painted by its materials
      const things = typeof m.frames === "function" ? m.frames() : m.frames ?? [m.thing], n = things.length;
      const paints = things.map((t, f) => (f && m.paint ? m.paint(t) : { colors: m.colors, ramps: m.ramps }));
      const meshes = things.map((t) => (t instanceof Splats ? undefined : t instanceof Voxels ? (m.as.some((f) => f !== "vox") ? t.mesh() : undefined) : t));
      const stem = (f: number) => `${m.name}${n > 1 ? `_${String(f).padStart(String(n - 1).length, "0")}` : ""}`, file = (f: number, ext: string) => join(out, `${stem(f)}.${ext}`);
      const moments = n > 1 ? ` (${n} moments: ${m.name}_${"0".repeat(String(n - 1).length)} to _${n - 1})` : "";
      for (const f of m.as) {
        if (f === "glb") {
          const b = encodeGlb(meshes as Mesh3[], m.name, paints.map((p) => p.colors), m.fps), r = readGlb(b);
          write(join(out, m.name + ".glb"), Buffer.from(b));
          lines.push(`glb ${m.name} ${r.vertices} vertices, ${r.triangles} triangles, ${r.materials} materials, Y up ${r.min.map((v) => +v.toFixed(2)).join(",")} to ${r.max.map((v) => +v.toFixed(2)).join(",")}${r.meshes > 1 ? ` (the first of ${r.meshes} moments, a loop of ${+r.seconds.toFixed(2)} s)` : ""}, ${kb(b)}`);
          continue;
        }
        let said = "";
        for (let k = 0; k < n; k++) {
          const t = things[k];
          if (f === "ply") {
            const b = encodePly(t as Splats, paints[k].ramps), r = readPly(b);
            write(file(k, "ply"), Buffer.from(b));
            said ||= `ply ${m.name} ${r.count} splats (3DGS: ${r.props.length} properties), Y up ${r.min.map((v) => +v.toFixed(2)).join(",")} to ${r.max.map((v) => +v.toFixed(2)).join(",")}, mean opacity ${r.opacity.toFixed(2)}, radius ${r.scale.toFixed(3)} m, ${kb(b)}`;
          } else if (f === "vox") {
            const V = t as Voxels, b = encodeVox(V, paints[k].colors), r = readVox(b), [lo, hi] = V.bounds();
            write(file(k, "vox"), Buffer.from(b));
            said ||= `vox ${m.name} ${r.size.join("x")}${r.models > 1 ? ` in ${r.models} models of 256 at most` : ""}, ${r.count} voxels of ${V.size.map((v) => +v.toFixed(4)).join(" x ")} m (${hi.map((v, e) => +(v - lo[e]).toFixed(2)).join(" x ")} m, from [${lo.map((v) => +v.toFixed(2)).join(", ")}]), ${r.colors} colors, ${kb(b)}`;
          } else {
            const { obj, mtl } = encodeObj(meshes[k]!, stem(k), paints[k].colors), r = readObj(obj);
            write(file(k, "obj"), obj); write(file(k, "mtl"), mtl);
            said ||= `obj ${m.name} ${r.vertices} vertices, ${r.faces} quads, ${r.materials} materials, ${kb(obj)}`;
          }
        }
        lines.push(said + moments);
      }
    } catch (e) {
      errors.push(wrap(e).within(`export3d '${m.name}'`, m.loc));
    }
  }
  return { lines, errors, times };
}
