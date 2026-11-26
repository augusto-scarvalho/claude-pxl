// Writes build results to disk: PNGs, layer PNGs, sheets + JSON, previews.
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { threadId } from "node:worker_threads";
import { PxError, didYouMean, wrap } from "../core/errors.ts";
import type { Img } from "../core/image.ts";
import { TRANSPARENT, toHex } from "../core/color.ts";
import type { Project } from "../core/project.ts";
import type { SheetDef } from "../core/model.ts";
import { type FrameTag, type SheetFrame, checker, onionSheet, packSheet, playAll, preview, previewScale, sheetJson, tiled } from "../core/render.ts";
import { emitImage, glows, normalImage } from "../core/normals.ts";
import { tiledMap } from "../core/tiled.ts";
import { encodeAseprite } from "./aseprite.ts";
import { encodeGif } from "./gif.ts";
import { encodePng } from "./png.ts";
import { encodeGlb, encodeObj, encodePly, encodeVox, readGlb, readObj, readPly, readVox } from "../core/files3d.ts";
import { Splats } from "../core/splats.ts";
import { type Mesh3, Voxels } from "../core/grids.ts";

export interface OutputOptions {
  /** Only these assets/sheets (default: the file's own, as `written` lists them). */
  only?: string[];
  /** Also what the file's include()s define (`pxl build --all`). */
  all?: boolean;
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
  /** How many of what the includes define were left unwritten (no `only`, no `all`). */
  left: number;
  errors: PxError[];
  /** How long each asset took to build and write, in ms. */
  times: [string, number][];
  /** Timing and size of each file written during this build (for `pxl build --profile`). */
  fileWrites: { file: string; bytes: number; ms: number }[];
}

let atomicSeq = 0;
const RETRY_CODES = new Set(["EBUSY", "EPERM", "EACCES", "UNKNOWN"]);
const pauseBuf = new Int32Array(new SharedArrayBuffer(4));
const sleepMs = (ms: number) => { try { Atomics.wait(pauseBuf, 0, 0, ms); } catch { const end = Date.now() + ms; while (Date.now() < end) { /* fallback */ } } };

/**
 * Atomic file write with brief retry on transient Windows file locks (e.g. a viewer or agent reading
 * a PNG/GIF right as pxl overwrites it). Writes to a sibling temp file first so readers never see a
 * half-written file.
 */
export function writeAtomic(path: string, data: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${threadId}.${++atomicSeq}.tmp`;
  writeFileSync(tmp, data);
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        renameSync(tmp, path);
        return;
      } catch (e) {
        const code = (e as NodeJS.ErrnoException)?.code ?? "";
        if (attempt < 5 && RETRY_CODES.has(code)) {
          sleepMs(15 * (attempt + 1));
          continue;
        }
        // Fallback: direct overwrite retry if rename is blocked on Windows, else rethrow
        if (attempt === 5 && RETRY_CODES.has(code)) {
          sleepMs(60);
          writeFileSync(path, data);
          try { unlinkSync(tmp); } catch { /* cleaned best-effort */ }
          return;
        }
        throw e;
      }
    }
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* cleaned best-effort */ }
    throw e;
  }
}

function write(path: string, data: string | Buffer): void {
  writeAtomic(path, data);
}

export function writePng(path: string, img: Img): void {
  write(path, encodePng(img));
}

/**
 * What a build writes when not told: the file's own assets, sheets and 3D files (its sheets and scenes
 * draw what they use from its includes); with `all`, or in a file that defines nothing itself (a stub
 * keeping an old path), what its includes define too.
 */
export function written(p: Project, all = false): string[] {
  const every = [...p.exported(), ...p.sheets.map((s) => s.name), ...p.models.map((m) => m.name)], own = every.filter((n) => !p.included.has(n));
  return all || !own.length ? every : own;
}

/** A sheet packed: its frames (an anim's each, name_0, name_1, ... with durations and a tag), in a cell each with `cell`, and the rows "tag" starts. */
export function packedSheet(p: Project, s: SheetDef): { items: { name: string; img: Img; ms?: number }[]; tags: FrameTag[]; rows?: Set<number>; sheet: Img; frames: SheetFrame[] } {
  let items: { name: string; img: Img; ms?: number }[] = [];
  const tags: FrameTag[] = [];
  const rename = s.opts.names, sockMap = s.opts.sockets;
  const mapImg = (img: Img) => {
    if (!sockMap || !img.sockets) return img;
    const o = img.copy();
    o.sockets = Object.fromEntries(Object.entries(img.sockets).map(([k, v]) => [sockMap[k] ?? k, v]));
    return o;
  };
  for (const name of p.sheetNames(s)) {
    const outName = rename?.[name] ?? (s.ns && name.startsWith(s.ns) ? rename?.[name.slice(s.ns.length)] : undefined) ?? name;
    const fr = p.drawn(name);
    if (!fr.length) { items.push({ name: outName, img: mapImg(p.image(name)) }); continue; }
    tags.push({ name: outName, from: items.length, to: items.length + fr.length - 1, direction: p.direction(name) });
    fr.forEach((f, i) => items.push({ name: `${outName}_${i}`, img: mapImg(f.img), ms: f.ms }));
  }
  if (!items.length) throw new PxError("sheet is empty (no entries matched)");
  if (s.opts.rows !== undefined && s.opts.rows !== "tag") throw new PxError(`rows can only be "tag" (each animation on a row of its own), got ${JSON.stringify(s.opts.rows)}`);
  if (s.opts.cell) {
    // one size for all: each frame's pivot (else its middle) lands on the cell's anchor (`pivot`: "center", "bottom", or [ax, ay])
    const at = (img: Img) => img.pivot ?? [img.w / 2, img.h / 2];
    const spans = items.map(({ img }) => {
      const b = img.bounds(), [px, py] = at(img);
      if (!b) return [0, 0, 0, 0];
      return [Math.max(0, px - b.x), Math.max(0, b.x + b.w - px), Math.max(0, py - b.y), Math.max(0, b.y + b.h - py)];
    });
    const maxL = Math.ceil(Math.max(0, ...spans.map((v) => v[0]))), maxR = Math.ceil(Math.max(0, ...spans.map((v) => v[1])));
    const maxA = Math.ceil(Math.max(0, ...spans.map((v) => v[2]))), maxB = Math.ceil(Math.max(0, ...spans.map((v) => v[3])));
    const pv = s.opts.pivot ?? "center";
    let cw: number, ch: number, ax: number, ay: number;
    if (s.opts.cell === "auto") {
      if (Array.isArray(pv)) {
        [ax, ay] = pv;
        if (ax < maxL || ay < maxA) throw new PxError(`pivot [${ax}, ${ay}] is too close to the edge for cell: "auto": need at least [${maxL}, ${maxA}]`);
        cw = Math.max(1, Math.ceil(ax + maxR));
        ch = Math.max(1, Math.ceil(ay + maxB));
      } else if (pv === "bottom") {
        cw = Math.max(1, 2 * Math.max(maxL, maxR));
        ch = Math.max(1, maxA + maxB);
        ax = cw / 2; ay = maxA;
      } else {
        cw = Math.max(1, 2 * Math.max(maxL, maxR));
        ch = Math.max(1, 2 * Math.max(maxA, maxB));
        ax = cw / 2; ay = ch / 2;
      }
    } else {
      [cw, ch] = s.opts.cell;
      if (Array.isArray(pv)) {
        [ax, ay] = pv;
        const bad = spans.findIndex(([l, r, a, b]) => l > ax || r > cw - ax || a > ay || b > ch - ay);
        if (bad >= 0) {
          const big = [Math.ceil(Math.max(maxL, ax) + maxR), Math.ceil(Math.max(maxA, ay) + maxB)];
          throw new PxError(`cell [${cw}, ${ch}] is too small: '${items[bad].name}' doesn't fit round its pivot; cell: [${big.join(", ")}] holds every frame`);
        }
      } else if (pv === "bottom") {
        ax = cw / 2; ay = ch - maxB;
        const bad = spans.findIndex(([l, r, a, b]) => 2 * Math.max(l, r) > cw || a + b > ch);
        if (bad >= 0) {
          const big = [2 * Math.max(maxL, maxR), maxA + maxB];
          throw new PxError(`cell [${cw}, ${ch}] is too small: '${items[bad].name}' doesn't fit round its pivot; cell: [${big.join(", ")}] holds every frame`);
        }
      } else {
        ax = cw / 2; ay = ch / 2;
        const need = spans.map(([l, r, a, b]) => [Math.ceil(2 * Math.max(l, r)), Math.ceil(2 * Math.max(a, b))]);
        const big = [Math.max(...need.map((n) => n[0])), Math.max(...need.map((n) => n[1]))], worst = items[need.findIndex((n) => n[0] > cw || n[1] > ch)];
        if (worst) throw new PxError(`cell [${cw}, ${ch}] is too small: '${worst.name}' doesn't fit round its pivot; cell: [${big.join(", ")}] holds every frame`);
      }
    }
    items = items.map((it) => { const [px, py] = at(it.img); return { ...it, img: it.img.sub(Math.round(px - ax), Math.round(py - ay), cw, ch) }; });
  }
  const rows = s.opts.rows === "tag" ? new Set(tags.flatMap((g) => [g.from, g.to + 1])) : undefined;
  return { items, tags, rows, ...packSheet(items, s.opts.cols, s.opts.pad, s.opts.extrude, rows) };
}

/** Build and write. Each asset fails independently; errors are collected, not thrown. */
export function writeOutputs(p: Project, out: string, opts: OutputOptions = {}): OutputResult {
  const lines: string[] = [], errors: PxError[] = [], times: [string, number][] = [];
  const fileWrites: { file: string; bytes: number; ms: number }[] = [];
  const write = (path: string, data: string | Buffer): void => {
    const t0 = performance.now();
    writeAtomic(path, data);
    fileWrites.push({ file: relative(out, path).replace(/\\/g, "/"), bytes: typeof data === "string" ? Buffer.byteLength(data) : data.byteLength, ms: performance.now() - t0 });
  };
  const writePng = (path: string, img: Img): void => {
    const t0 = performance.now();
    const buf = encodePng(img);
    writeAtomic(path, buf);
    fileWrites.push({ file: relative(out, path).replace(/\\/g, "/"), bytes: buf.byteLength, ms: performance.now() - t0 });
  };
  const sheetNames = new Set([...p.sheets.map((s) => s.name), ...p.models.map((m) => m.name)]);
  if (opts.only)
    for (const n of opts.only)
      if (!p.assets.has(n) && !sheetNames.has(n))
        errors.push(new PxError(`unknown asset or sheet '${n}'${didYouMean(n, [...p.order, ...sheetNames])}`));

  const want = new Set(opts.only ?? written(p, opts.all)), left = opts.only ? 0 : written(p, true).filter((n) => !want.has(n)).length;
  const prev = (name: string, img: Img): string => {
    if (opts.preview === false) return "";
    const s = opts.scale ?? previewScale(img);
    writePng(join(out, "_preview", name + ".png"), preview(img, s));
    return ` @${s}x`;
  };

  const names = p.order.filter((n) => want.has(n));
  // Precompute which assets are still referenced by wanted sheets or as bases, so finished standalone assets
  // and sheet members can be evicted from memory promptly on large multi-figure rosters.
  const wantSheets = p.sheets.filter((s) => want.has(s.name));
  const sheetMembers = new Map<SheetDef, string[]>();
  const sheetUse = new Map<string, number>();
  for (const s of wantSheets) {
    try {
      const ms = p.sheetNames(s);
      sheetMembers.set(s, ms);
      for (const m of ms) sheetUse.set(m, (sheetUse.get(m) ?? 0) + 1);
    } catch { /* errors surface in the sheet loop below */ }
  }
  const baseUsed = new Set<string>();
  for (const d of p.assets.values()) if (d.opts.base) baseUsed.add(d.opts.base);
  const lastScene = names.findLastIndex((n) => p.assets.get(n)!.kind === "scene");
  // (handed out to the workers, if any, workers.ts: each anim's frames, a sprite; a scene's frames stay here)
  if (p.elsewhere) for (const n of names) { const k = p.assets.get(n)!.kind; if (k === "anim") p.handOut(n, 0, undefined, 600); else if (k !== "scene") p.elsewhere.ahead([[n, 0, 0]]); }
  // a map's file (<x>_n.png, <x>_e.png) that is another's own (an asset x with normals beside an asset
  // x_n, a sheet beside a sheet x_n): an error naming both, and the map not written over it
  const folder = (k: string) => (k === "scene" ? "scenes" : k === "anim" ? "anims" : "sprites"), files = new Set(p.exported());
  const writeMap = (what: string, n: string, dir: string, suffix: string, kind: "normal" | "emission", img: () => Img, loc?: string): boolean => {
    const o = n + suffix, d = p.assets.get(o), other = dir ? d && files.has(o) && folder(d.kind) === dir && `${d.kind} '${o}'` : p.sheets.some((s) => s.name === o) && `sheet '${o}'`;
    if (other) { errors.push(new PxError(`${what} '${n}': its ${kind} map would be ${dir ? dir + "/" : ""}${o}.png, the file of ${other} too (a heading's sprite?): rename one of them${what === "sheet" ? ` (or pass ${kind === "normal" ? 'normalSuffix: ".normal"' : 'emitSuffix: ".emit"'})` : ""}; the map isn't written`, loc)); return false; }
    writePng(join(out, dir, o + ".png"), img());
    return true;
  };
  for (let idx = 0; idx < names.length; idx++) {
    const n = names[idx], def = p.assets.get(n)!, t0 = performance.now();
    try {
      const b = p.build(n);
      const dir = def.kind === "scene" ? "scenes" : def.kind === "anim" ? "anims" : "sprites";
      const frames = b.anim ? p.frames(n) : [];
      let shown = b.img, info = "", own: Buffer | undefined, ownPal: number[] | undefined;
      if (def.kind === "anim") {
        // Anims: a horizontal strip of the drawn frames + Aseprite-style JSON (the tag carries the
        // direction), plus a GIF of the full playback.
        const drawn = p.drawn(n);
        const { sheet, frames: fr } = packSheet(drawn.map((f, i) => ({ name: `${n}_${i}`, img: f.img, ms: f.ms })), drawn.length);
        writePng(join(out, dir, n + ".png"), sheet);
        write(join(out, dir, n + ".json"), sheetJson(n + ".png", sheet, fr, [{ name: n, from: 0, to: fr.length - 1, direction: p.direction(n) }]));
        if (drawn.some((f) => f.img.norm)) writeMap(def.kind, n, dir, "_n", "normal", () => packSheet(drawn.map((f) => ({ name: "", img: normalImage(f.img) })), drawn.length).sheet, def.loc); // laid out as the art
        if (drawn.some((f) => glows(f.img))) writeMap(def.kind, n, dir, "_e", "emission", () => packSheet(drawn.map((f) => ({ name: "", img: emitImage(f.img) })), drawn.length).sheet, def.loc);
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
        if (b.img.norm) writeMap(def.kind, n, dir, "_n", "normal", () => normalImage(b.img), def.loc); // for engine lights
        if (glows(b.img)) writeMap(def.kind, n, dir, "_e", "emission", () => emitImage(b.img), def.loc);
      }
      if (frames.length) {
        let gifUnique = frames.length;
        write(join(out, dir, n + ".gif"), (own = encodeGif(frames, { onPalette: (pl) => { ownPal = pl; }, onInfo: (i) => { gifUnique = i.unique; } })));
        const play = p.direction(n);
        info = play === "forward" ? ` (${frames.length} frames, ${b.anim!.loop}ms)` : ` (${p.drawn(n).length} frames ${play}, ${b.anim!.loop}ms)`;
        if (b.anim && !b.anim.durations) {
          const total = Math.max(1, Math.round(b.anim.loop / b.anim.step));
          if (total > 600) info += ` -- capped at ${frames.length} of ${total} frames (${Math.round(frames.length * b.anim.step)}ms of ${b.anim.loop}ms)`;
        }
        if (def.kind === "anim" && frames.length > 1 && gifUnique === 1) info += ` -- static: all ${frames.length} frames identical`;
      }
      if (opts.share) {
        // to post: the art itself enlarged by a whole number, nearest neighbour, nothing drawn over it; a PNG past the
        // 16,777,216 px an image holds once scaled (a long anim's strip) is left out and said, its GIF still written
        const s = opts.share, drawn = def.kind === "anim" ? p.drawn(n) : [], art = drawn.length ? packSheet(drawn.map((f, i) => ({ name: `${n}_${i}`, img: f.img })), drawn.length).sheet : b.img;
        if (art.w * art.h * s * s <= 16_777_216) writePng(join(out, "share", n + ".png"), art.scale(s));
        else info += ` -- share/${n}.png not written: ${drawn.length ? `its ${drawn.length} frames in one strip` : "it"} at ${s}x would be ${art.w * s}x${art.h * s} px, past the 16,777,216 an image holds${frames.length ? `; share/${n}.gif written, ${frames[0].img.w * s}x${frames[0].img.h * s}` : ""}`;
        if (frames.length) write(join(out, "share", n + ".gif"), encodeGif(frames, { scale: s, palette: ownPal }));
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
          const opaque = frames.every((f) => !f.guide && !f.img.data.some((c) => (c & 255) === 0));
          // At 1x, every frame, opaque: reuse the asset's own GIF bytes directly.
          // At 2x..5x (no pixel grid drawn) and opaque: encode from 1x frames with nearest-neighbor scale
          // (reusing the 1x palette when k === 1), producing byte-identical output without s²x scan/medianCut.
          const gif = k === 1 && s === 1 && opaque ? own!
            : s < 6 && opaque ? encodeGif(frames.filter((_, i) => i % k === 0).map((f) => ({ img: f.img, ms: f.ms * k })), { scale: s, palette: k === 1 ? ownPal : undefined })
            : encodeGif(frames.filter((_, i) => i % k === 0).map((f) => ({ img: preview(f.guide ?? f.img, s), ms: f.ms * k })));
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
      if (b.anim?.capped) info += ` -- loops don't line up, cut at 60s${b.anim.cappedBy ? ` (${b.anim.cappedBy})` : ""}: use loop: "longest" / "hold" or put durations on one grid (fps 4, 5, 10 or ms in 100s; fps 6 makes 167ms frames)`;
      lines.push(`${def.kind} ${n} ${b.img.w}x${b.img.h}${info}${pv}`);
    } catch (e) {
      errors.push(wrap(e));
    }
    if (!p.elsewhere && idx > lastScene && !sheetUse.has(n) && !baseUsed.has(n) && !p.named(n)) p.evict(n);
    times.push([n, performance.now() - t0]);
  }

  for (const s of p.sheets) {
    if (!want.has(s.name)) continue;
    try {
      const { items, tags, rows, sheet, frames } = packedSheet(p, s);
      // (the last sheet's frames in hand, nothing more is built: the workers stop, and what they hold goes before its
      // files are written, the most this thread holds)
      if (s === p.sheets.findLast((x) => want.has(x.name))) p.elsewhere?.end();
      const sc = s.opts.scale ?? 1;
      const outSheet = sc > 1 ? sheet.scale(sc) : sheet;
      const outFrames = sc > 1 ? frames.map((f) => ({ ...f, x: f.x * sc, y: f.y * sc, img: f.img.scale(sc) })) : frames;
      writePng(join(out, s.name + ".png"), outSheet);
      // the normal and emission maps in the same rectangles, for engine lights (the art's json serves both)
      let normalMap: string | undefined, emissionMap: string | undefined;
      const nSuf = s.opts.normalSuffix ?? "_n", eSuf = s.opts.emitSuffix ?? "_e";
      if (items.some((it) => it.img.norm)) {
        const ok = writeMap("sheet", s.name, "", nSuf, "normal", () => {
          const m = packSheet(items.map((it) => ({ ...it, img: normalImage(it.img) })), s.opts.cols, s.opts.pad, s.opts.extrude, rows).sheet;
          return sc > 1 ? m.scale(sc) : m;
        }, s.loc);
        if (ok) normalMap = `${s.name}${nSuf}.png`;
      }
      if (items.some((it) => glows(it.img))) {
        const ok = writeMap("sheet", s.name, "", eSuf, "emission", () => {
          const m = packSheet(items.map((it) => ({ ...it, img: emitImage(it.img) })), s.opts.cols, s.opts.pad, s.opts.extrude, rows).sheet;
          return sc > 1 ? m.scale(sc) : m;
        }, s.loc);
        if (ok) emissionMap = `${s.name}${eSuf}.png`;
      }
      // palette slots: the sheet's colors as they first appear, and each slot's in the same order (a
      // palette swap's lookup), in the JSON and as .hex files beside it (rrggbb: alpha stays the art's)
      const cs = s.slots && [...new Set(sheet.data)].filter((c) => c !== TRANSPARENT);
      const pals = cs && { palette: cs.map(toHex), slots: Object.fromEntries(s.slots!.map(([n, m]) => [n, cs.map((c) => toHex(m.get(c) ?? c))])) };
      const more = { ...(pals ?? {}), ...(s.opts.meta ?? {}) };
      write(join(out, s.name + ".json"), sheetJson(s.name + ".png", outSheet, outFrames, tags, more, {
        format: s.opts.format, scale: sc, pad: (s.opts.pad ?? 0) * sc, extrude: (s.opts.extrude ?? 0) * sc, normalMap, emissionMap,
      }));
      if (pals) for (const [n, l] of [["", pals.palette], ...Object.entries(pals.slots)] as [string, string[]][]) write(join(out, `${s.name}${n && "." + n}.hex`), l.map((h) => h.slice(1, 7) + "\n").join(""));
      lines.push(`sheet ${s.name} ${outSheet.w}x${outSheet.h} (${frames.length} frames)${prev(s.name, outSheet)}`);
      // a sheet of animations also plays them all at once in its preview, each in a cell of its own at
      // its own timing (a character's moves side by side, to judge them together)
      // (its frames made as the encoder asks for them, one held at a time; at 1x the checker put in only where they changed)
      if (tags.length && opts.preview !== false) {
        write(join(out, "_preview", s.name + ".gif"), encodeGif(function* () {
          let k = 0;
          for (const f of playAll(tags, items)) {
            k ||= opts.scale ?? previewScale(f.img);
            yield k === 1 ? { ...f, img: checker(f.img, f.changed) } : { img: preview(f.img, k), ms: f.ms, changed: f.changed?.map((r) => r.map((v) => v * k)) };
          }
        }));
      }
    } catch (e) {
      errors.push(wrap(e).within(`sheet '${s.name}'`, s.loc));
    }
    const ms = sheetMembers.get(s);
    if (ms && !p.elsewhere) {
      for (const m of ms) {
        const leftUses = (sheetUse.get(m) ?? 1) - 1;
        if (leftUses > 0) { sheetUse.set(m, leftUses); continue; }
        sheetUse.delete(m);
        if (!baseUsed.has(m) && !p.named(m)) p.evict(m);
      }
    }
  }
  // 3D files, each read back to say what it holds
  for (const m of p.models) {
    if (!want.has(m.name)) continue;
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
  return { lines, errors, times, left, fileWrites };
}
