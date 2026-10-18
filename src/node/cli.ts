// pxl command line.
import { basename, dirname, join, resolve } from "node:path";
import { PxError, wrap } from "../core/errors.ts";
import { type Color, TRANSPARENT, toHex } from "../core/color.ts";
import { Palette } from "../core/palette.ts";
import { Img } from "../core/image.ts";
import { type Snapshot, describe } from "../core/describe.ts";
import type { BuildOut } from "../core/build.ts";
import type { World } from "../core/model.ts";
import { rigLines } from "../core/rig.ts";
import { ascii, compareSilhouettes, preview } from "../core/render.ts";
import { mapPixel, replay, stepSheet } from "../core/steps.ts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadProject } from "./load.ts";
import { decodePng } from "./png.ts";
import { reduceColors } from "./gif.ts";
import { writeOutputs, writePng } from "./output.ts";
import { serve } from "./server.ts";
import { help } from "./help.ts";

const USAGE = `pxl — pixel-art DSL

  pxl help [name]
      What the reference says about an op or option (and where the examples use it); no name: an index.
  pxl build <art.px.js> [--out DIR] [--only a,b] [--scale N] [--no-preview] [--aseprite]
      Build PNGs (out/sprites, out/scenes, out/anims strips + JSON + GIF, sheets + JSON) and
      previews (out/_preview; animated assets also get a .gif). --aseprite also writes each
      asset as <name>.aseprite (layers, frames, tag, palette) to keep editing in Aseprite; pxl
      never reads it back and the next --aseprite build overwrites it, so copy it out of out/.
  pxl serve <art.px.js> [--port 4321] [--out DIR | --no-out] [--no-preview]
      Live viewer: rebuilds on save and replays each asset's painting steps.
  pxl ascii <art.px.js> <name>
      Print an asset as palette keys with x/y rulers (anims: every frame).
  pxl list  <art.px.js>
      List assets, groups and sheets with their source locations.
  pxl describe <art.px.js> <name> [--cell N] [--at x,y,w,h] [--diff] [--brief]   (or: pxl describe <image.png> [...])
      A whole scene as text to read at once: what was painted (steps grouped by source line), what
      was placed where, cell maps (object on top, color before lighting, brightness after it), how
      each placement stands out from its surroundings; --at adds that region's exact pixels. Any PNG
      works too: its colors get keys, and repeats are found as identical 16x16 tiles.
  pxl steps <art.px.js> <name> [--at x,y] [--sheet] [--out DIR]
      How an asset was painted: every step (op, file:line, pixels changed, where), in order.
      --at x,y lists only the steps that changed that pixel of the final image, and its color
      after each; --sheet also writes a thumbnail per step to _preview/<name>_steps.png.
  pxl blind <art.px.js> <name...> [--out DIR]   |   pxl blind <art.px.js> --check answers.json
      Check facing labels against the drawings with a reader who doesn't know them: writes each
      asset (a rig: each of its parts) to <out>/_blind/<n>.png, shuffled and unnamed, and the
      labels to key.json. Show only the images to the reader, ask which way each one faces (right,
      left, front = toward us, back), save the answers as {"1": "right", ...}; --check compares.
  pxl compare <art.px.js> <name> <ref.png> [--shrink N] [--offset x,y]
      Silhouette check: each row's opaque extents in the asset and in a reference image (shrunk
      by N first, placed at x,y), and how many px wider the asset is on each side.

Art files may be .js or .ts. Default out dir: <art file dir>/out.`;

interface Args {
  cmd?: string;
  file?: string;
  rest: string[];
  out?: string | false;
  only?: string[];
  scale?: number;
  preview?: boolean;
  aseprite?: boolean;
  port?: number;
  at?: number[];
  cell?: number;
  diff?: boolean;
  brief?: boolean;
  sheet?: boolean;
  shrink?: number;
  offset?: [number, number];
  check?: string;
}

function parse(argv: string[]): Args {
  const a: Args = { rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    const val = () => {
      const x = argv[++i];
      if (x === undefined) throw new PxError(`${v} needs a value`);
      return x;
    };
    if (v === "--out") a.out = val();
    else if (v === "--no-out") a.out = false;
    else if (v === "--only") a.only = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (v === "--scale") a.scale = Number(val());
    else if (v === "--port") a.port = Number(val());
    else if (v === "--no-preview") a.preview = false;
    else if (v === "--aseprite") a.aseprite = true;
    else if (v === "--sheet") a.sheet = true;
    else if (v === "--shrink") a.shrink = Number(val());
    else if (v === "--offset") {
      const m = /^(-?\d+),(-?\d+)$/.exec(val().replace(/\s/g, ""));
      if (!m) throw new PxError("--offset needs x,y (e.g. --offset 8,-1)");
      a.offset = [Number(m[1]), Number(m[2])];
    }
    else if (v === "--at") {
      const m = /^(\d+),(\d+)(?:,(\d+),(\d+))?$/.exec(val().replace(/\s/g, ""));
      if (!m) throw new PxError("--at needs x,y (steps) or x,y,w,h (describe), e.g. --at 5,3");
      a.at = m.slice(1).filter((s) => s !== undefined).map(Number);
    }
    else if (v === "--cell") a.cell = Number(val());
    else if (v === "--diff") a.diff = true;
    else if (v === "--brief") a.brief = true;
    else if (v === "--check") a.check = val();
    else if (v === "-h" || v === "--help") a.cmd = "usage";
    else if (v.startsWith("--")) throw new PxError(`unknown flag ${v}\n\n${USAGE}`);
    else if (!a.cmd) a.cmd = v;
    else if (!a.file) a.file = v;
    else a.rest.push(v);
  }
  return a;
}

export async function main(argv: string[]): Promise<number> {
  let a: Args;
  try { a = parse(argv); } catch (e) { console.error(wrap(e).message); return 2; }
  if (a.cmd === "help") {
    // the reference looked up, not read: an index, or what it says about one name
    console.log(help(a.file) + (a.file ? "" : "\n\nCommands: pxl build | serve | ascii | list | steps | describe | compare (pxl --help for their options)"));
    return 0;
  }
  if (!a.cmd || a.cmd === "usage" || !a.file) {
    console.log(USAGE);
    return a.cmd === "usage" ? 0 : 2;
  }
  const file = resolve(a.file);
  const outDir = typeof a.out === "string" ? resolve(a.out) : join(dirname(file), "out");
  try {
    switch (a.cmd) {
      case "build": {
        const p = loadProject(file);
        const r = writeOutputs(p, outDir, { only: a.only, preview: a.preview, scale: a.scale, aseprite: a.aseprite });
        for (const l of r.lines) console.log(l);
        for (const e of r.errors) console.error("error: " + e.message);
        console.log(`-> ${outDir}${r.errors.length ? ` (${r.errors.length} error${r.errors.length > 1 ? "s" : ""})` : ""}`);
        return r.errors.length ? 1 : 0;
      }
      case "ascii": {
        const name = a.rest[0];
        if (!name) throw new PxError("ascii needs an asset name: pxl ascii <file> <name>");
        const p = loadProject(file);
        const pal = p.assets.get(name)?.pal ?? p.pal;
        if (p.assets.get(name)?.kind === "anim")
          p.drawn(name).forEach((f, i) => console.log(`frame ${i} (${f.ms}ms)\n${ascii(f.img, pal)}\n`));
        else console.log(ascii(p.image(name), pal));
        return 0;
      }
      case "list": {
        const p = loadProject(file);
        for (const n of p.order) {
          const d = p.assets.get(n)!;
          console.log(`${d.kind.padEnd(6)} ${n.padEnd(24)} ${d.loc ?? ""}`);
        }
        for (const g of p.groups.values()) console.log(`${"group".padEnd(6)} ${g.name.padEnd(24)} ${g.loc ?? ""}  [${g.members.join(" ")}]`);
        for (const s of p.sheets) console.log(`${"sheet".padEnd(6)} ${s.name.padEnd(24)} ${s.loc ?? ""}`);
        return 0;
      }
      case "describe": {
        if (a.at && a.at.length !== 4) throw new PxError("describe --at needs a region x,y,w,h (e.g. --at 120,140,40,30)");
        const at = a.at as [number, number, number, number] | undefined;
        let name: string, b: BuildOut, pal: Palette, frames: BuildOut[] | undefined, note: string | undefined, world: World | undefined, extra: string[] | undefined;
        if (/\.png$/i.test(file)) {
          // any image: its colors get index keys, most common first (past 62 they show as "~")
          let img: Img;
          try { img = decodePng(readFileSync(file)); } catch (e) { throw new PxError(`${a.file}: ${(e as Error).message}`); }
          const n = new Map<Color, number>();
          for (const c of img.data) if (c !== TRANSPARENT) n.set(c, (n.get(c) ?? 0) + 1);
          name = basename(file);
          if (n.size > 64 && !img.data.some((c) => c === TRANSPARENT)) {
            // many colors (a lit render, a painting): read it in 32, or every pixel is its own patch
            const from = n.size;
            img = reduceColors(img, 32);
            n.clear();
            for (const c of img.data) n.set(c, (n.get(c) ?? 0) + 1);
            note = `(read in ${n.size} colors, reduced from ${from})`;
          }
          b = { img, layers: [], placements: [] };
          pal = Palette.fromColors([...n].sort((x, y) => y[1] - x[1]).slice(0, 62).map(([c]) => c));
        } else {
          name = a.rest[0];
          if (!name) throw new PxError("describe needs an asset name: pxl describe <file> <name> [--cell N] [--at x,y,w,h] [--diff]");
          const p = loadProject(file, { trace: true });
          const def = p.assets.get(name);
          if (!def) throw new PxError(`unknown asset '${name}'`);
          b = p.build(name);
          pal = def.pal;
          world = def.opts.world;
          const rig = p.rigs.get(name);
          if (rig) extra = rigLines(rig, (part) => p.has(part), (part, flip) => (flip ? p.image(part).flip("x") : p.image(part)));
          frames = b.anim ? p.frames(name, 0, 64).map((f) => p.build(name, 0, f.t)) : undefined;
        }
        // each describe keeps what it saw in <out>/_describe; --diff compares with the last one
        const keep = join(outDir, "_describe", name.replace(/[^\w.-]/g, "_"));
        let prev: Snapshot | undefined;
        if (a.diff) {
          if (!existsSync(keep + ".json")) console.log(`(no earlier describe of ${name} in ${join(outDir, "_describe")}: this one is kept for the next --diff)\n`);
          else prev = { objects: JSON.parse(readFileSync(keep + ".json", "utf8")).objects, img: decodePng(readFileSync(keep + ".png")), unlit: decodePng(readFileSync(keep + ".unlit.png")) };
        }
        const r = describe(name, b, pal, { cell: a.cell, at, frames, prev, note, brief: a.brief, world, extra });
        console.log(r.text);
        if (a.out !== false) {
          writePng(keep + ".png", r.snap.img);
          writePng(keep + ".unlit.png", r.snap.unlit);
          writeFileSync(keep + ".json", JSON.stringify({ name, time: new Date().toISOString(), objects: r.snap.objects }, null, 1) + "\n");
        }
        return 0;
      }
      case "steps": {
        const name = a.rest[0];
        if (!name) throw new PxError("steps needs an asset name: pxl steps <file> <name> [--at x,y] [--sheet]");
        const p = loadProject(file, { trace: true });
        const def = p.assets.get(name);
        const b = p.build(name);
        if (!def || !b.trace) throw new PxError(`no painting log for '${name}'`);
        const rev = def.pal.reverse();
        const key = (c: Color) => (c === TRANSPARENT ? "." : rev.get(c) ?? toHex(c));
        const label = (s: string) => (s.length > 48 ? s.slice(0, 47) + "…" : s).padEnd(48);
        const row = (n: number, text: string, loc: string | undefined, info: string) =>
          console.log(`${String(n).padStart(4)}  ${label(text)}  ${(loc ?? "").padEnd(22)}  ${info}`);
        const final = { w: b.img.w, h: b.img.h }, frame0 = b.anim ? ", frame 0" : "";
        if (a.at) {
          const [x, y] = a.at;
          if (x >= final.w || y >= final.h) throw new PxError(`(${x}, ${y}) is outside ${name} (${final.w}x${final.h})`);
          console.log(`${name} pixel (${x}, ${y}): the steps that changed it${frame0}`);
          let prev: Color = TRANSPARENT, lost = false;
          replay(b.trace, (s, img) => {
            const i = mapPixel(x, y, final, s.w, s.h);
            if (i === undefined) {
              if (!lost) row(s.n, s.label, s.loc, "(canvas cropped here: the pixel can't be followed)");
              lost = true;
              return;
            }
            lost = false;
            if (img.data[i] !== prev) row(s.n, s.label, s.loc, `-> ${key(img.data[i])}`);
            prev = img.data[i];
          });
          return 0;
        }
        console.log(`${name}: ${b.trace.frames.length} steps (${def.kind} ${final.w}x${final.h}${frame0})`);
        // A sheet holds up to 120 steps: every k-th one (and the last) when there are more.
        const thumbs: { n: number; img: Img }[] = [], total = b.trace.frames.length, every = Math.ceil(total / 120);
        replay(b.trace, (s, img) => {
          const at = s.box ? `${s.changed}px at ${s.box.x},${s.box.y} ${s.box.w}x${s.box.h}` : "no change";
          row(s.n, s.label, s.loc, !s.fresh ? at : s.n === 1 ? `${at} (canvas ${s.w}x${s.h})` : `canvas resized to ${s.w}x${s.h}`);
          if (a.sheet && ((s.n - 1) % every === 0 || s.n === total)) thumbs.push({ n: s.n, img: img.copy() });
        });
        if (a.sheet) {
          const path = join(outDir, "_preview", name + "_steps.png"), sheet = stepSheet(thumbs);
          writePng(path, preview(sheet, Math.max(1, Math.min(3, Math.floor(2400 / Math.max(sheet.w, sheet.h))))));
          console.log(`-> ${path}${every > 1 ? ` (every ${every}th of ${total} steps)` : ""}`);
        }
        return 0;
      }
      case "compare": {
        const [name, ref] = a.rest;
        if (!name || !ref) throw new PxError("compare needs an asset and a reference PNG: pxl compare <file> <name> <ref.png> [--shrink N] [--offset x,y]");
        const p = loadProject(file);
        const img = p.image(name);
        let r: Img;
        try { r = decodePng(readFileSync(resolve(ref))); } catch (e) { throw new PxError(`${ref}: ${(e as Error).message}`); }
        if (a.shrink !== undefined) {
          if (!(Number.isInteger(a.shrink) && a.shrink >= 2)) throw new PxError(`--shrink must be a whole factor >= 2, got ${a.shrink}`);
          r = r.shrink(a.shrink);
        }
        console.log(`${name} (${img.w}x${img.h}) against ${ref} (${r.w}x${r.h}${a.shrink ? `, shrunk ${a.shrink}x` : ""}${a.offset ? ` at ${a.offset.join(",")}` : ""})`);
        console.log(compareSilhouettes(img, r, ...(a.offset ?? [0, 0])));
        return 0;
      }
      case "blind": {
        const dir = join(outDir, "_blind");
        const words: Record<string, string> = { right: "right", left: "left", front: "front", "toward us": "front", us: "front", back: "back", away: "back" };
        if (a.check) {
          if (!existsSync(join(dir, "key.json"))) throw new PxError(`no ${join(dir, "key.json")}: run pxl blind <file> <names...> first`);
          const key = JSON.parse(readFileSync(join(dir, "key.json"), "utf8")) as { n: number; name: string; facing: string }[];
          const ans = JSON.parse(readFileSync(resolve(a.check), "utf8")) as Record<string, string>;
          let agree = 0, asked = 0;
          for (const k of key) {
            const said = ans[String(k.n)];
            if (said === undefined || k.facing === "none") continue;
            asked++;
            const w = words[String(said).toLowerCase().trim()] ?? String(said);
            if (w === k.facing) agree++;
            else console.log(`${k.n} ${k.name}: labelled ${k.facing}, the reader says ${said}: look at it`);
          }
          console.log(`${agree} of ${asked} labels agree with the reader`);
          return agree === asked ? 0 : 1;
        }
        if (!a.rest.length) throw new PxError("blind needs assets (or rigs) to show: pxl blind <file> <name...>");
        const p = loadProject(file), items: { name: string; img: Img }[] = [];
        for (const n of a.rest) {
          const rig = p.rigs.get(n);
          if (!rig) { items.push({ name: n, img: p.image(n) }); continue; }
          for (const [slot, s] of rig.slots) {
            const own = s.part ?? `${rig.name}_${slot}`;
            if (p.has(own)) items.push({ name: own, img: p.image(own) });
            else if (s.mirrorOf && p.has(s.mirrorOf)) items.push({ name: `${s.mirrorOf} flipped (${n})`, img: p.image(s.mirrorOf).flip("x") });
          }
        }
        // shuffled, so the order gives nothing away; each on a plain gray, 8x
        const order = items.map((it, i) => ({ it, r: (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 })).sort((u, v) => u.r - v.r).map(({ it }) => it);
        const key = order.map(({ name, img }, i) => {
          const f = img.orient?.f, facing = !f ? "none" : Math.abs(f[2]) > Math.max(Math.abs(f[0]), Math.abs(f[1])) ? (f[2] < 0 ? "front" : "back") : f[0] > 0 ? "right" : "left";
          const k = 8, o = new Img(img.w * k + 16, img.h * k + 16).fill(0x808080ff);
          for (let y = 0; y < img.h * k; y++) for (let x = 0; x < img.w * k; x++) {
            const c = img.data[Math.floor(y / k) * img.w + Math.floor(x / k)];
            if (c !== TRANSPARENT) o.data[(y + 8) * o.w + x + 8] = c;
          }
          writePng(join(dir, `${i + 1}.png`), o);
          return { n: i + 1, name, facing };
        });
        writeFileSync(join(dir, "key.json"), JSON.stringify(key, null, 1) + "\n");
        console.log(`${key.length} images in ${dir} (1.png ... ${key.length}.png), the labels in key.json.`);
        console.log(`Give a reader only the images (not the art file, not key.json) and ask, for each: which way does it face: right, left, front (toward us) or back? Save the answers as {"1": "right", ...} and run: pxl blind ${a.file} --check answers.json`);
        return 0;
      }
      case "serve": {
        const s = await serve(file, { port: a.port, out: a.out === false ? false : outDir, preview: a.preview });
        console.log(`pxl live viewer: ${s.url}  (watching ${file}; Ctrl+C to stop)`);
        return await new Promise<number>(() => {});
      }
      default:
        console.error(`unknown command '${a.cmd}'\n\n${USAGE}`);
        return 2;
    }
  } catch (e) {
    console.error("error: " + wrap(e).message);
    return 1;
  }
}
