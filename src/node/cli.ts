// pxl command line.
import { basename, dirname, join, resolve } from "node:path";
import { PxError, wrap } from "../core/errors.ts";
import { type Color, TRANSPARENT, pack, toHex } from "../core/color.ts";
import { lineFlaws } from "../core/vision.ts";
import { Palette } from "../core/palette.ts";
import { Img } from "../core/image.ts";
import { type Snapshot, describe } from "../core/describe.ts";
import type { BuildOut } from "../core/build.ts";
import type { World } from "../core/model.ts";
import type { Project } from "../core/project.ts";
import { rigLines } from "../core/rig.ts";
import { rampSteps } from "../core/checks.ts";
import { ascii, compareSilhouettes, preview } from "../core/render.ts";
import { mapPixel, replay, stepSheet } from "../core/steps.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadProject } from "./load.ts";
import { decodePng } from "./png.ts";
import { reduceColors } from "./gif.ts";
import { writeOutputs, writePng } from "./output.ts";
import { serve } from "./server.ts";
import { checkProject } from "./check.ts";
import { cellRow, diffRow, frameTime, otherVersion, shotChanges, shotRow, stack } from "./shot.ts";
import { help } from "./help.ts";
import { listProject, listText } from "./list.ts";
import { readMedia } from "./media.ts";
import { study } from "../core/study.ts";
import { profileReport, profiled } from "./profile.ts";

const USAGE = `pxl — pixel-art DSL

  pxl help [name | "words of a heading"] [--all]
      What the reference says about an op or option: the rows that define it, a line for each other
      mention, and a few uses in the examples (--all: everything in full). Words of a guide's
      heading print that section ("characters 9", "small animals"). No name: an index.
  pxl build <art.px.js> [--out DIR] [--only a,b] [--scale N] [--share N] [--no-preview] [--aseprite] [--list] [--every N] [--profile]
      Build PNGs (out/sprites, out/scenes, out/anims strips + JSON + GIF, sheets + JSON) and
      previews (out/_preview; animated assets also get a .gif). --share N also writes out/share/:
      each asset N times bigger, nearest neighbour, clear kept, no checker or grid (and a GIF when
      it moves), to post. A whole file of more than 12 assets
      prints a count of what it wrote; --only and --list print a line per asset (size, frames,
      preview scale). --every N: preview GIFs keep one frame in N (a long loop's runs to many MB).
      --aseprite also writes each asset as <name>.aseprite (layers, frames, tag, palette) to keep
      editing in Aseprite; pxl never reads it back and the next --aseprite build overwrites it, so
      copy it out of out/. --profile: where the time went, read off the CPU profiler: the slowest
      assets, then the functions that spent the most time themselves, in the art file (what to make
      faster: work done again every frame, a noise called millions of times) and in pxl.
  pxl serve <art.px.js> [--port 4321] [--out DIR | --no-out] [--no-preview]
      Live viewer: rebuilds on save and replays each asset's painting steps.
  pxl ascii <art.px.js> <name> [--frame N]
      Print an asset as palette keys with x/y rulers (anims: every frame; --frame N: that one).
  pxl list  <art.px.js>
      A map of the file (and what it includes): each top-level statement that defines assets, each
      function and each const of 5 lines or more, its line range, the comment above it and what it
      defines (a loop's many assets on one line); then groups and sheets. A file that doesn't run on
      its own (one meant to be included) is mapped from its text. Read those lines, not the file.
  pxl describe <art.px.js> <name> [--cell N] [--at x,y,w,h] [--frame N] [--diff] [--brief] [--out DIR | --no-out]   (or: pxl describe <image.png> [...])
      A whole scene as text to read at once: what was painted (steps grouped by source line), what
      was placed where, cell maps (object on top, color before lighting, brightness after it), how
      each placement stands out from its surroundings; --at adds that region's exact pixels; --frame
      reads an animated asset at frame N of its loop (a scene: each step of its clock), not the
      first. Any PNG works too: its colors get keys, and repeats are found as identical 16x16 tiles.
  pxl check <art.px.js> [name...] [--frame N] [--readings]
      Every check describe makes that can warn (facing, front marker, lit side, parallel parts, feet
      on the ground, lettering), on every scene and rig the file defines (not those it includes, or
      just the named assets) and the front marker of any other asset that has one, from one load: the
      warnings only, one line each. An animated scene is checked at every frame of its loop, each
      distinct placement once, and a warning says at which frames (--frame N: that one only). Exits 1
      when there is any. LOOK lines, which don't fail it: the L-corners and jaggies in the 1 px
      lines of every sprite drawn by hand (grids, runs()), a doubled step or a corner the shape has
      (a line whose steps are nearly all L's is drawn square on purpose: none), and tones side by side
      too close to tell apart. --readings also lists what the lit-side rule read on every placement,
      warning or not, with a tally: to see where it agrees and where it can't tell.
  pxl shot <art.px.js> <name> [<name> | <other.px.js>:<name> | <image or clip> ...] [--frames a,b,c | a-b | all] [--at x,y,w,h ...] [--scale N] [--vs <git rev | file>] [--diff] [--out DIR]
  pxl shot <image or clip> [<image or clip> ...] [--frames a,b,c | a-b | all] [--at x,y,w,h ...] [--scale N] [--out DIR]
      A picture to look at: those frames of the asset (numbered as for --frame; default 0) cropped
      to the region, side by side, enlarged, written to <out>/_shot/<name>.png. --vs puts the same
      shot of another version above it (at a git revision, the file and what it includes as they
      were there); --diff adds a row with the pixels that changed in red. It
      also prints what changed since the last shot of the same frames and region (one asset, one
      region: pixels, where) and the warnings pxl check finds on the asset at those frames (its
      LOOK lines too, the pixels they name ringed in <name>_look.png): one call per look. A clip's
      note gives each shown frame's ms. Several names (another file's as other.px.js:name, or any PNG) make a row each, one
      under the other, and several --at a column each: two versions, two agents' scenes, details of
      a big one.
      Give PNGs at 1x (out/scenes/x.png): rows are enlarged together.
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
  pxl study <picture | gif | video> [--at x,y,w,h] [--from S] [--seconds S] [--fps N] [--colors N] [--to WxH] [--px N] [--out DIR | --no-out]
      Learn from finished art or a reference: what it is made of and what to use in pxl to make the
      same. Pixel art (an upscale found by its grid, blurred or not; --px N when the size it finds
      is wrong, as on a blurred copy read at half its pixel) is read at 1x: its palette and ramps
      (hue shifts), near twins, outlines (black, selective), a line's L-corners and jaggies,
      dithering, anti-aliasing, clusters, banding, pillow shading, where the light comes from,
      tiles. Anything else (a photo, a painting, a
      render) is read for its masses of light and dark, its colors as ramps, the light's color
      against the shadows', the haze with distance, and translated by superpixels into a small
      picture in few colors to draw over (--to, --colors). An editor's transparency checker exported
      with it is taken for clear; a reflection under it is told (its row and opacity) and set aside.
      Both: straight edges and where they meet (one, two or three points, the horizon). Animated
      (a GIF, a video): timing, a cycle, whether it loops, planes going by and their speeds
      (parallax), a scene opening out from the point it moves toward; and its pieces, each with what to
      build it with: the backdrop, sprites carried along a path, walks, things going across, anims in
      place, rigs (parts moving against a still body), actions (an attack, with the frames of its
      smears), effects (fire, water), and the lights (told
      apart first: where each shines from, how strongly, its color). Writes _study/<name>.png (a sheet
      to look at), the picture at 1x (or the translation) and <name>.hex; animated, each piece cut out
      of its background (<name>_pieces.png, a strip each in <name>_piece<N>.png, the tracks in
      <name>_pieces.json); --no-out prints the text only. --at is in the drawing's own pixels, as
      shot's and the positions study prints are (a 2x picture's 10,10 is its file's 20,20); on a
      clip it also follows what moves in that region, its box every frame, its spacing (one mover
      in the region reads best). PNG and
      GIF are read by pxl; JPEG, WebP and video through ffmpeg if on PATH.

Art files may be .js or .ts. Default out dir: <art file dir>/out.`;

interface Args {
  cmd?: string;
  file?: string;
  rest: string[];
  out?: string | false;
  only?: string[];
  scale?: number;
  share?: number;
  preview?: boolean;
  aseprite?: boolean;
  profile?: boolean;
  port?: number;
  at?: number[];
  /** Every --at given (shot: a column each). */
  ats: number[][];
  cell?: number;
  diff?: boolean;
  brief?: boolean;
  sheet?: boolean;
  shrink?: number;
  offset?: [number, number];
  check?: string;
  frame?: number;
  frames?: number[];
  allFrames?: boolean;
  vs?: string;
  list?: boolean;
  all?: boolean;
  every?: number;
  readings?: boolean;
  colors?: number;
  to?: [number, number];
  from?: number;
  seconds?: number;
  fps?: number;
  px?: number;
}

function parse(argv: string[]): Args {
  const a: Args = { rest: [], ats: [] };
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
    else if (v === "--scale") {
      // pixel art scales by whole numbers only: 2.5x makes its pixels 2 and 3 px wide by turns
      const n = Number(val());
      if (!Number.isInteger(n) || n < 1) throw new PxError(`--scale is a whole number of times (1, 2, 3...): at a fraction some pixels come out a px wider than others; got ${argv[i]}`);
      a.scale = n;
    }
    else if (v === "--share") {
      const n = Number(val());
      if (!Number.isInteger(n) || n < 1) throw new PxError(`--share is a whole number of times (1, 2, 3...), as pixel art only scales so; got ${argv[i]}`);
      a.share = n;
    }
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
      a.ats.push(a.at);
    }
    else if (v === "--cell") a.cell = Number(val());
    else if (v === "--diff") a.diff = true;
    else if (v === "--brief") a.brief = true;
    else if (v === "--check") a.check = val();
    else if (v === "--frame") a.frame = Number(val());
    else if (v === "--frames") { const f = val().trim(); if (f === "all") a.allFrames = true; else a.frames = framesFrom(f); }
    else if (v === "--vs") a.vs = val();
    else if (v === "--list") a.list = true;
    else if (v === "--all") a.all = true;
    else if (v === "--every") a.every = Number(val());
    else if (v === "--readings") a.readings = true;
    else if (v === "--profile") a.profile = true;
    else if (v === "--colors") a.colors = Number(val());
    else if (v === "--to") {
      const m = /^(\d+)x(\d+)$/.exec(val().trim());
      if (!m) throw new PxError("--to needs WxH (e.g. --to 320x180)");
      a.to = [Number(m[1]), Number(m[2])];
    }
    else if (v === "--from") a.from = Number(val());
    else if (v === "--seconds") a.seconds = Number(val());
    else if (v === "--fps") a.fps = Number(val());
    else if (v === "--px") { a.px = Number(val()); if (!(Number.isInteger(a.px) && a.px >= 2 && a.px <= 64)) throw new PxError(`--px is the size of a pixel in the picture, a whole number 2..64, got ${a.px}`); }
    else if (v === "-h" || v === "--help") a.cmd = "usage";
    else if (v.startsWith("--")) throw new PxError(`unknown flag ${v}\n\n${USAGE}`);
    else if (!a.cmd) a.cmd = v;
    else if (!a.file) a.file = v;
    else a.rest.push(v);
  }
  return a;
}

/** `--frames 0,4,8` or `0-17` or both (`0-3,12`), as frame numbers. */
function framesFrom(spec: string): number[] {
  return spec.split(",").flatMap((part) => {
    const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
    if (m) { const [a, b] = [Number(m[1]), Number(m[2])]; return Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => (a <= b ? a + i : a - i)); }
    const n = Number(part.trim());
    if (!Number.isInteger(n) || n < 0) throw new PxError(`--frames takes frame numbers, ranges or all (e.g. --frames 0,4,8 or 0-17): not "${part.trim()}"`);
    return [n];
  });
}
// a picture or a clip given to shot instead of an asset: read like study reads it
const MEDIA = /\.(png|gif|jpe?g|webp|bmp|mp4|webm|mov|mkv|avi)$/i;
/** 100, 100, 100, 300 -> "100x3, 300": a clip's frame times, as a row of them reads. */
const runs = (v: number[]) => v.reduce<[number, number][]>((r, x) => { const l = r[r.length - 1]; if (l && l[0] === x) l[1]++; else r.push([x, 1]); return r; }, []).map(([x, k]) => (k > 1 ? `${x}x${k}` : `${x}`)).join(", ");
/** An art file's name, for what a look keeps for the next one (two files' "meadow" in one out dir). */
const fileTag = (f: string) => basename(f).replace(/\.(px\.)?[jt]s$/, "").replace(/[^\w.-]/g, "_");
/** Cells in rows of `cols` at most: a long clip as lines of frames, not one strip. */
const wrapRow = (imgs: Img[], regions: (number[] | undefined)[], cols = 12) => (imgs.length <= cols || regions.length > 1 ? cellRow(imgs, regions) : stack(Array.from({ length: Math.ceil(imgs.length / cols) }, (_, r) => cellRow(imgs.slice(r * cols, (r + 1) * cols), regions))));

export async function main(argv: string[]): Promise<number> {
  let a: Args;
  try { a = parse(argv); } catch (e) { console.error(wrap(e).message); return 2; }
  if (a.cmd === "help") {
    // the reference looked up, not read: an index, or what it says about one name
    console.log(help(a.file, { all: a.all }) + (a.file ? "" : "\n\nCommands: pxl build | serve | ascii | list | steps | describe | check | shot | compare | blind | study | help (pxl --help for their options)"));
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
        const build = () => { const p = loadProject(file); return { p, r: writeOutputs(p, outDir, { only: a.only, preview: a.preview, scale: a.scale, aseprite: a.aseprite, every: a.every, share: a.share }) }; };
        let report = "";
        const { p, r } = a.profile ? await profiled(build).then(({ result, profile }) => { report = profileReport(profile, [file, ...result.p.files], result.r.times); return result; }) : build();
        for (const w of p.warnings) console.error(`warning: ${w.loc ? w.loc + ": " : ""}${w.msg}`);
        if (a.only || a.list || r.lines.length <= 12) for (const l of r.lines) console.log(l);
        else {
          // a whole file: what it wrote, counted (a rig file makes hundreds of parts and poses), and
          // the lines that carry a note
          const kinds = new Map<string, number>();
          for (const l of r.lines) kinds.set(l.split(" ")[0], (kinds.get(l.split(" ")[0]) ?? 0) + 1);
          for (const l of r.lines) if (/ -- |\(tiled: /.test(l)) console.log(l);
          console.log(`${r.lines.length} written: ${[...kinds].map(([k, n]) => `${n} ${k}${n > 1 ? "s" : ""}`).join(", ")} (--list: one line each)`);
        }
        for (const e of r.errors) console.error("error: " + e.message);
        if (report) console.log(report);
        console.log(`-> ${outDir}${r.errors.length ? ` (${r.errors.length} error${r.errors.length > 1 ? "s" : ""})` : ""}`);
        return r.errors.length ? 1 : 0;
      }
      case "ascii": {
        const name = a.rest[0];
        if (!name) throw new PxError("ascii needs an asset name: pxl ascii <file> <name>");
        const p = loadProject(file);
        const pal = p.assets.get(name)?.pal ?? p.pal;
        if (a.frame !== undefined) console.log(`frame ${a.frame}\n${ascii(p.image(name, 0, frameTime(p, name, a.frame)), pal)}`);
        else if (p.assets.get(name)?.kind === "anim")
          p.drawn(name).forEach((f, i) => console.log(`frame ${i} (${f.ms}ms)\n${ascii(f.img, pal)}\n`));
        else console.log(ascii(p.image(name), pal));
        return 0;
      }
      case "study": {
        const m = readMedia(file, { at: a.at, from: a.from, seconds: a.seconds, fps: a.fps, px: a.px });
        const name = basename(file).replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_");
        const r = study({ name, frames: m.frames, ms: m.ms, kind: m.kind, drawnAt: m.drawnAt }, { colors: a.colors, to: a.to, px: a.px, region: a.at ? [a.at[0], a.at[1]] : undefined });
        // --no-out: the text only, no files written
        if (a.out === false) { for (const l of r.text) console.log(l); return 0; }
        const dir = join(a.out ?? join(dirname(file), "out"), "_study");
        mkdirSync(dir, { recursive: true });
        const pic = join(dir, `${name}${r.pixelArt ? "_1x" : "_px"}.png`), sheetPath = join(dir, `${name}.png`), hexPath = join(dir, `${name}.hex`);
        writePng(sheetPath, r.sheet); writePng(pic, r.picture);
        const piecesPng = join(dir, `${name}_pieces.png`), piecesJson = join(dir, `${name}_pieces.json`);
        if (r.pieces) { writePng(piecesPng, r.pieces.sheet); writeFileSync(piecesJson, JSON.stringify(r.pieces.json)); r.pieces.strips.forEach((s, i) => writePng(join(dir, `${name}_piece${i + 1}.png`), s)); }
        writeFileSync(hexPath, r.palette.map((c) => toHex(c).slice(1, 7)).join("\n") + "\n");
        for (const l of r.text) console.log(l);
        for (const l of ["", "FILES", `  ${sheetPath}: the sheet (the picture; ${r.pixelArt ? "its techniques marked; " : ""}its edges and vanishing points; the ramps${m.frames.length > 1 ? "; frames; the flow" : ""})`, `  ${pic}: ${r.pixelArt ? "the drawing at 1x" : "the translation, to draw over"}`, `  ${hexPath}: the palette, ramp by ramp, dark to light`, ...(r.pieces ? [`  ${piecesPng}: each piece alone, numbered as in PIECES, its background taken away`, `  ${join(dir, `${name}_piece<N>.png`)}: each piece's frames in a strip (a whole cycle when it has one), clear behind it`, `  ${piecesJson}: each piece's kind and its box in every frame (its track)`] : [])]) console.log(l);
        return 0;
      }
      case "list": {
        let lines: string[];
        try { lines = listProject(loadProject(file)); } catch (e) { lines = listText(file, (e as Error).message.split("\n")[0]); }
        for (const l of lines) console.log(l);
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
          b = p.build(name, 0, a.frame ? frameTime(p, name, a.frame) : 0);
          pal = def.pal;
          world = def.opts.world;
          const rig = p.rigs.get(name);
          if (rig) extra = rigLines(rig, { has: (part) => p.has(part), image: (part, flip) => (flip ? p.image(part).flip("x") : p.image(part)) }, rampSteps(def.pal));
          frames = b.anim ? p.frames(name, 0, 64).map((f) => p.build(name, 0, f.t)) : undefined;
        }
        // each describe keeps what it saw in <out>/_describe; --diff compares with the last one
        const keep = join(outDir, "_describe", `${fileTag(file)}.${name.replace(/[^\w.-]/g, "_")}`);
        let prev: Snapshot | undefined;
        if (a.diff) {
          if (!existsSync(keep + ".json")) console.log(`(no earlier describe of ${name} in ${join(outDir, "_describe")}: this one is kept for the next --diff)\n`);
          else prev = { objects: JSON.parse(readFileSync(keep + ".json", "utf8")).objects, img: decodePng(readFileSync(keep + ".png")), unlit: decodePng(readFileSync(keep + ".unlit.png")) };
        }
        const r = describe(name, b, pal, { cell: a.cell, at, frames, prev, note, brief: a.brief, world, extra, frame: a.frame });
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
          // a shade or light step: the ramps it went along (where a shadow left its ramp for another's)
          const via = (from: Color, to: Color, label: string) => {
            if (from === TRANSPARENT || !def.pal.ramps.length || !/^(shade|light)\(| in (shade|light) layer '/.test(label)) return "";
            const path = def.pal.stepPath(from, to, -1) ?? def.pal.stepPath(from, to, 1);
            return path ? `  (${path})` : "";
          };
          replay(b.trace, (s, img) => {
            const i = mapPixel(x, y, final, s.w, s.h);
            if (i === undefined) {
              if (!lost) row(s.n, s.label, s.loc, "(canvas cropped here: the pixel can't be followed)");
              lost = true;
              return;
            }
            lost = false;
            if (img.data[i] !== prev) row(s.n, s.label, s.loc, `-> ${key(img.data[i])}${via(prev, img.data[i], s.label)}`);
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
      case "check": {
        const p = loadProject(file, { checksOnly: true });
        const r = checkProject(p, { names: a.rest.length ? a.rest : undefined, frame: a.frame, file: basename(file), readings: a.readings });
        for (const l of [...r.lines, ...r.notes]) console.log(l);
        console.log(`${r.warnings ? `${r.warnings} warning${r.warnings > 1 ? "s" : ""}` : "no warnings"}${r.notes.length ? `, ${r.notes.length} to look at` : ""} (checked ${r.checked}${a.frame ? `, at frame ${a.frame}` : ""})`);
        console.log(r.coverage);
        if (r.readings) console.log(["", "readings (each placement's lit side against world.light, warning or not):", ...r.readings.map((l) => "  " + l), r.tally].join("\n"));
        return r.warnings ? 1 : 0;
      }
      case "shot": {
        // what to shoot: assets of this file, another's (`other.px.js:name`), or any picture or clip
        // (`a.png`, `ref.gif`, a JPEG, a video: a clip shows all its frames, drawn larger it is read at 1x)
        const png = MEDIA.test(file), entries = png ? [file, ...a.rest] : a.rest;
        if (!entries.length) throw new PxError("shot needs an asset name: pxl shot <file> <name> [<name> | <other.px.js>:<name> | <image or clip> ...] [--frames a,b | a-b | all] [--at x,y,w,h ...] [--scale N] [--vs rev] [--diff]");
        if (a.ats.some((r) => r.length !== 4)) throw new PxError("shot --at needs a region x,y,w,h (e.g. --at 120,140,40,30)");
        if (a.diff && !a.vs) throw new PxError("shot --diff compares with another version: give it --vs <git rev | file>");
        const regions = a.ats.length ? a.ats : [undefined];
        const framesFor = (p: Project, name: string) => (a.allFrames ? Array.from({ length: Math.max(1, p.frames(name).length) }, (_, i) => i) : a.frames ?? (a.frame !== undefined ? [a.frame] : [0]));
        const projects = new Map<string, Project>(), proj = (f: string) => projects.get(f) ?? projects.set(f, loadProject(f)).get(f)!;
        const shots = entries.map((e) => {
          if (MEDIA.test(e)) return { png: resolve(e), name: basename(e).replace(MEDIA, "") };
          const m = /^(.+\.px\.(?:js|ts)):([^:]+)$/.exec(e);
          return m ? { file: resolve(m[1]), name: m[2] } : { file, name: e };
        });
        // several things, or several regions: a row each, one under the other, a column per region
        if (shots.length > 1 || regions.length > 1 || png) {
          if (a.vs) throw new PxError("shot --vs compares one asset with another version of it: give it one name and one region");
          const many = shots.map((s) => {
            if ("png" in s) {
              const m = readMedia(s.png!), pick = a.allFrames || (!a.frames && m.frames.length > 1) ? m.frames.map((_, i) => i) : (a.frames ?? [0]).filter((f) => f < m.frames.length);
              if (!pick.length) throw new PxError(`${s.png}: it has ${m.frames.length} frame${m.frames.length === 1 ? "" : "s"} (0-${m.frames.length - 1})`);
              return { ...s, row: wrapRow(pick.map((f) => m.frames[f]), regions), note: m.frames.length > 1 || m.drawnAt ? `${basename(s.png!)}: ${m.kind}${m.drawnAt ? `, drawn at ${m.drawnAt.sx}x, shown at 1x` : ""}${m.frames.length > 1 ? `, frames ${pick.length === m.frames.length ? `all ${m.frames.length}` : pick.join(",")}, ms ${runs(pick.map((f) => m.ms[f]))}` : ""}` : "" };
            }
            const p = proj(s.file), frames = framesFor(p, s.name);
            return { ...s, row: wrapRow(frames.map((f) => p.build(s.name, 0, frameTime(p, s.name, f)).img), regions), frames };
          });
          const sheet = stack(many.map((s) => s.row)), k = a.scale ?? Math.max(1, Math.min(16, Math.floor(Math.sqrt(600000 / (sheet.w * sheet.h))), Math.floor(1568 / Math.max(sheet.w, sheet.h))));
          const path = join(outDir, "_shot", many.map((s) => s.name).join("+").replace(/[^\w.+-]/g, "_").slice(0, 100) + ".png");
          writePng(path, sheet.scale(k));
          const asset = many.find((s) => "frames" in s) as { frames: number[] } | undefined;
          console.log(`-> ${path} (${asset ? `frames ${asset.frames.join(",")}; ` : ""}rows, top down: ${entries.map((e) => (MEDIA.test(e) ? basename(e) : e)).join(", ")}${regions.length > 1 ? `; columns: ${a.ats.map((r) => r.join(",")).join(" | ")}` : ""}; ${k}x)`);
          for (const s of many) if ("note" in s && s.note) console.log(s.note);
          for (const s of many) {
            if (!("file" in s)) continue;
            const p = proj(s.file!), r = checkProject(p, { names: [s.name], frames: framesFor(p, s.name) });
            for (const l of [...r.lines, ...r.notes]) console.log(l);
            if (r.warnings || p.assets.get(s.name)?.kind === "scene" || p.rigs.has(s.name))
              console.log(`${s.name}: ${r.warnings ? `${r.warnings} warning${r.warnings > 1 ? "s" : ""}` : "no warnings"}; ${r.coverage}`);
          }
          return 0;
        }
        const { name } = shots[0], p = proj(shots[0].file!), frames = framesFor(p, name), now = shotRow(p, name, frames, a.at);
        const rows = [now];
        if (a.vs) {
          const o = otherVersion(file, a.vs);
          let was: Img;
          try { was = shotRow(loadProject(o.path, {}, o.read), name, frames, a.at); } catch (e) { throw wrap(e).within(`--vs ${a.vs}`); }
          rows.unshift(was);
          if (a.diff) {
            const d = diffRow(was, now);
            rows.push(d.img);
            console.log(`${d.changed} px changed`);
          }
        }
        // as big as ~600k px allow (an image costs ~w*h/750 tokens: about what a preview costs), never
        // past the 1568 px a model is shown
        const sheet = stack(rows), k = a.scale ?? Math.max(1, Math.min(16, Math.floor(Math.sqrt(600000 / (sheet.w * sheet.h))), Math.floor(1568 / Math.max(sheet.w, sheet.h))));
        const base = join(outDir, "_shot", name.replace(/[^\w.-]/g, "_")), path = base + ".png", last = join(outDir, "_shot", `${fileTag(file)}.${name.replace(/[^\w.-]/g, "_")}`);
        writePng(path, sheet.scale(k));
        console.log(`-> ${path} (frames ${frames.join(",")}${a.vs ? `; above: ${a.vs}` : ""}${a.diff ? "; below: what changed" : ""}; ${k}x)`);
        // against the last shot of the same frames and region: did the edit change anything, and where
        const key = JSON.stringify({ frames, at: a.at ?? null });
        if (existsSync(last + ".last.json") && readFileSync(last + ".last.json", "utf8") === key)
          console.log(`since the last shot: ${shotChanges(decodePng(readFileSync(last + ".last.png")), now, frames, a.at)}`);
        writePng(last + ".last.png", now);
        writeFileSync(last + ".last.json", key);
        // what pxl check finds on it at these frames, so a look needs no other call
        const r = checkProject(p, { names: [name], frames });
        for (const l of [...r.lines, ...r.notes]) console.log(l);
        // the line faults the LOOK lines name, ringed on the asset (corners orange, jaggies blue)
        if (r.notes.some((l) => / LOOK: \d+ (L-corner|jagg)/.test(l))) {
          const img = p.image(name), f = lineFlaws(img), s = Math.max(4, k), out = img.scale(s);
          const ring = (x: number, y: number, c: Color) => { for (let i = 0; i < s; i++) for (const [u, v] of [[i, 0], [i, s - 1], [0, i], [s - 1, i]]) out.set(x * s + u, y * s + v, c); };
          for (const [x, y] of f.corners) ring(x, y, pack(255, 140, 20));
          for (const [x, y] of f.jaggies) ring(x, y, pack(40, 120, 255));
          const lookPath = base + "_look.png";
          writePng(lookPath, out);
          console.log(`-> ${lookPath} (the LOOK lines' pixels ringed: L-corners orange, jaggies blue)`);
        }
        if (r.warnings || p.assets.get(name)?.kind === "scene" || p.rigs.has(name))
          console.log(`${r.warnings ? `${r.warnings} warning${r.warnings > 1 ? "s" : ""}` : "no warnings"}; ${r.coverage}`);
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
          if (!(Number.isInteger(a.shrink) && a.shrink >= 1)) throw new PxError(`--shrink must be a whole factor >= 1, got ${a.shrink}`);
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
            // a two-faced part: each face drawn (a turned rig's own, else the original's flipped)
            const names = s.faces ? Object.values(s.faces) : [s.part ?? `${rig.name}_${slot}`];
            for (const nm of names) {
              const own = s.faces && rig.from && nm.startsWith(rig.from + "_") ? rig.name + nm.slice(rig.from.length) : nm;
              if (p.has(own) && (!s.faces || own !== nm || !rig.from)) items.push({ name: own, img: p.image(own) });
              else if (s.faces && rig.from && p.has(nm)) items.push({ name: `${nm} flipped (${n})`, img: p.image(nm).flip("x") });
              else if (!s.faces && s.mirrorOf && p.has(s.mirrorOf)) items.push({ name: `${s.mirrorOf} flipped (${n})`, img: p.image(s.mirrorOf).flip("x") });
            }
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
        console.log(`Give a reader only the images (not the art file, not key.json) and ask, for each: which way does it face: right, left, front (toward us) or back? Save the answers as {"1": "right", ...} and run: pxl blind ${a.file} --check answers.json${a.out ? ` --out ${a.out}` : ""}`);
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
