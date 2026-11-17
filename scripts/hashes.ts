// A hash of every asset an art file makes (frame 0), a line each: run it before and after a change to
// the engine that shouldn't move a pixel (a refactor, a faster path). The tests keep only what
// `pxl check` says, and `pxl shot --vs` compares versions of the art, not of pxl.
//
//   node scripts/hashes.ts > after.txt                every example and lib/ file (as the examples test lists them)
//   node scripts/hashes.ts examples/hd2d/graveyard.px.js examples/perspective/race.px.js
//   node scripts/hashes.ts --vs HEAD                  every example and lib/ file built by the last commit's pxl too: what differs
//   node scripts/hashes.ts --vs HEAD --frames 12 --only "^graveyard" examples/hd2d/graveyard.px.js
//   node scripts/hashes.ts --vs HEAD --strip "crew|lamps"   names under those includes' `as` taken without it
//   node scripts/hashes.ts --vs HEAD --png diffs      each frame that differs written there, the revision's and yours
//   node scripts/hashes.ts --cache a.px.js b.px.js    builds read back from the store where it has them
//   node scripts/hashes.ts --vs HEAD --data --frames lib/characters/x.px.js   each frame's boxes, sockets, pivot, ms and data too
//
// --vs <rev> builds each file with the pxl and the examples at a git revision too (unpacked once into
// the system's temp folder, see vs.ts), in this process, and prints only the lines that differ and a
// count; it exits 1 when one does. An asset the revision hasn't (a new library entry, in every file that
// includes it) is listed as new and counted apart: no pixel of what was there moved. --frames hashes
// every frame of the animated assets, `asset@frame` a line (--frames N: N frames spread over the loop, a
// cheap look at a long scene). --only <regex>: the assets whose name matches. --strip <namespaces>: a
// name under them ("crew.tr_walk_e") is keyed without them ("tr_walk_e"), unless the file has that name
// of its own: the same pixels after an include takes an `as`. A file that doesn't build on its own
// (included only) prints SKIP; an asset that fails prints ERR and the error's first line.
// --vs builds nothing of a file whose every input is the same at the revision: pxl's src/ and each file it reads
// (itself, its includes, palettes, PNGs: the loader's list). A build is a function of those alone, so its pixels are
// the same without tracing them; such files are counted apart. --all builds them anyway.
// A line that differs says where: that frame built again on both sides (it alone) and compared, "N px changed in
// x,y wxh" (or both sizes); --png DIR writes the two as <file>.<asset>@<frame>_<rev>.png and _here.png, to stack
// with pxl shot (two PNGs and --diff). --cache leaves PXL_CACHE as the environment has it (else it is off): the same
// files run off, on and on again, the three outputs the same, prove a build read back from the store is the build
// made; not an engine change (a build read back may be one made before it): that proof runs without --cache.
// --data hashes with each frame's pixels what an engine reads off it (its boxes, sockets, pivot, ms and setData's
// data), "data <hash>" after them; a line that differs names the fields that do ("the same pixels; not the same: boxes").
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { frameCount, frameTime, shotChanges } from "../src/node/shot.ts";
import { writePng } from "../src/node/output.ts";
import { record } from "../src/node/threads.ts";
import { startWorkers } from "../src/node/workers.ts";
import { artFiles, inTree, loader, pick, repo, revTree } from "./vs.ts";

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(k); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const flag = (k: string) => args.includes(k) && !!args.splice(args.indexOf(k), 1);
const all = flag("--all"), data = flag("--data");
// real builds on both sides, never those kept on disk (store.ts), unless --cache: a comparison read from it proves nothing of the engine
if (!flag("--cache")) process.env.PXL_CACHE = "0";
const vs = opt("--vs"), png = opt("--png"), only = new RegExp(opt("--only") ?? ""), strip = opt("--strip"), under = strip && new RegExp(`^((${strip})\\.)+`);
let cap = 1;
const fi = args.indexOf("--frames");
if (fi >= 0) { cap = /^\d+$/.test(args[fi + 1] ?? "") ? +args[fi + 1] : Infinity; args.splice(fi, cap === Infinity ? 1 : 2); }
const files = args.length ? args.map((f) => resolve(f)) : artFiles().map((f) => join(repo, f));

// --data: what an engine reads off the frame besides its pixels, hashed with them
const fields = (p: any, n: string, i: number, img: any) => {
  const tl = p.timeline(n);
  return { boxes: img.boxes, sockets: img.sockets, pivot: img.pivot, ms: tl ? (tl.durations?.[i] ?? tl.step) : undefined, data: img.info };
};

// each line's hash, and its asset, time, label (asset@frame) to build that frame again where it differs, and --data's fields
function lines(load: (f: string) => any, file: string, name: string): { out: Map<string, string>; at: Map<string, [string, number, string, Record<string, unknown>?]>; p?: any } {
  const out = new Map<string, string>(), at = new Map<string, [string, number, string, Record<string, unknown>?]>();
  let p;
  try { p = load(file); } catch { return { out: out.set(name, "SKIP"), at }; }
  const order = p.order as string[], mine = new Set(order);
  for (const n of order) {
    if (!only.test(n)) continue;
    const bare = under ? n.replace(under, "") : n, k = mine.has(bare) && bare !== n ? n : bare;
    try {
      const fr = pick(frameCount(p, n), cap);
      // (an anim's frames it will build handed out to the workers, if any: PXL_WORKERS)
      p.handOut?.(n, 0, fr.map((i) => frameTime(p, n, i)));
      for (const i of fr) {
        const t = frameTime(p, n, i), key = i ? `${name} ${k}@${i}` : `${name} ${k}`, img = p.image(n, 0, t), d = data ? fields(p, n, i, img) : undefined;
        out.set(key, img.hash() + (d ? ` data ${createHash("sha1").update(JSON.stringify(d)).digest("hex").slice(0, 8)}` : ""));
        at.set(key, [n, t, `${k}@${i}`, d]);
        p.forget(n, t);
      }
    } catch (e) { out.set(`${name} ${k}`, `ERR ${(e as Error).message.split("\n")[0]}`); }
  }
  return { out, at, p };
}
type Lines = ReturnType<typeof lines>;

// where a line that differs differs: its frame built again on both sides, compared; --png writes the two
let wrote = 0;
const where = (a: Lines, b: Lines, k: string, file: string): string => {
  const said = `${a.out.get(k) ?? "(none)"} at ${vs}, ${b.out.get(k) ?? "(none)"} here`, was = a.at.get(k), now = b.at.get(k);
  if (!was || !now || [a.out.get(k), b.out.get(k)].some((h) => /^(ERR|SKIP)/.test(h!))) return said;
  // --data: which of its fields differ (by name: one renamed between the two reads as two)
  const moved = was[3] && now[3] ? [...new Set([...Object.keys(was[3]), ...Object.keys(now[3])])].filter((f) => JSON.stringify(was[3]![f]) !== JSON.stringify(now[3]![f])) : [];
  const also = moved.length ? `; not the same: ${moved.join(", ")}` : "";
  if (a.out.get(k)!.split(" ")[0] === b.out.get(k)!.split(" ")[0]) return `the same pixels${also}`;
  try {
    const A = a.p.image(was[0], 0, was[1]), B = b.p.image(now[0], 0, now[1]);
    if (png) {
      const base = join(resolve(png), `${basename(file).replace(/\.px\.[jt]s$/, "")}.${now[2]}`.replace(/[^\w.@-]/g, "_"));
      writePng(`${base}_${vs!.replace(/[^\w.-]/g, "_")}.png`, A);
      writePng(`${base}_here.png`, B);
      wrote++;
    }
    return shotChanges(A, B, [0]) + also;
  } catch { return said + also; }
};

// (the working tree's builds made by as many workers as pxl build's, workers.ts: PXL_WORKERS=N, else the machine's
// record, read from a copy of it, as a time taken here beside the revision's builds would mean nothing)
const copy = join(tmpdir(), `pxl-threads-${process.pid}.json`);
try { copyFileSync(record.file, copy); } catch { /* no record yet */ }
record.file = copy;
const load = await loader(repo), here = (f: string) => { const p = load(f); startWorkers(p, f, {}, "build"); return p; };
const tree = vs ? revTree(vs) : "", there = vs ? await loader(tree) : undefined;
// the same bytes here and at the revision: one file, and pxl's whole src/
const sameFile = (f: string) => { const o = inTree(tree, f); return o === resolve(f) || (existsSync(o) && readFileSync(o).equals(readFileSync(f))); };
const srcOf = (root: string) => (readdirSync(join(root, "src"), { recursive: true }) as string[]).filter((f) => statSync(join(root, "src", f)).isFile()).sort();
const sameSrc = !!vs && !all && srcOf(repo).join() === srcOf(tree).join() && srcOf(repo).every((f) => sameFile(join(repo, "src", f)));
const untouched = (f: string) => { try { return sameSrc && (here(f).files as string[]).every(sameFile); } catch { return false; } };
let same = 0, differ = 0, added = 0, spared = 0;
for (const f of files) {
  if (untouched(f)) { spared++; continue; }
  // (named from examples/ as before, a lib file from the repo: lib/nature/kit.px.js)
  const rel = relative(repo, f).split("\\").join("/"), name = rel.startsWith("examples/") ? rel.slice(9) : rel.startsWith("..") || isAbsolute(rel) ? f : rel, b = lines(here, f, name);
  if (!there) { for (const [k, h] of b.out) console.log(`${k} ${h}`); continue; }
  // a file the revision hasn't (a new example): all its lines new, not a SKIP that differs
  const a: Lines = existsSync(inTree(tree, f)) ? lines(there, inTree(tree, f), name) : { out: new Map(), at: new Map() };
  for (const k of new Set([...a.out.keys(), ...b.out.keys()])) {
    if (a.out.get(k) === b.out.get(k)) { same++; continue; }
    if (!a.out.has(k)) { added++; console.log(`${k}: new here, ${b.out.get(k)}`); continue; }
    differ++;
    console.log(`${k}: ${where(a, b, k, f)}`);
  }
}
// (after the last command's measure is written into the copy, at exit)
process.on("exit", () => { try { unlinkSync(copy); } catch { /* none written */ } });
if (vs) {
  if (wrote) console.log(`-> ${resolve(png!)} (${wrote} frame${wrote > 1 ? "s that differ" : " that differs"}, each as <file>.<asset>@<frame>_${vs}.png and _here.png)`);
  console.log(`${same} the same, ${differ} differ${added ? `, ${added} new` : ""} (${vs} against the working tree)${spared ? `; ${spared} file${spared > 1 ? "s" : ""} not built: what ${spared > 1 ? "they read" : "it reads"} and pxl's src are the same at ${vs}` : ""}`);
  if (differ) process.exitCode = 1;
}
