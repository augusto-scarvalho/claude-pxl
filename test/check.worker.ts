// One example's `pxl check` lines, in a thread of its own: examples.test.ts hands the examples out to
// a few of these, one per four of the machine's threads (the scenes checked frame by frame take seconds
// each; on a 4-core laptop more threads took as long and only heated it). With them, the files the check
// read (the example, what it includes, its palettes, PNGs and poses): the next run checks it again only
// when one of them changed, or pxl did.
import { parentPort } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { loadProject } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";

parentPort!.on("message", ({ root, f }: { root: string; f: string }) => {
  let out: string[], read: string[] = [];
  const t0 = performance.now();
  try {
    const p = loadProject(join(root, "examples", f), { checksOnly: true }, (abs) => { read.push(abs); return readFileSync(abs, "utf8"); });
    // every frame of every animated scene (the bout's blows, the blocks, the last clash included)
    const r = checkProject(p, { file: basename(f) });
    out = [`${f}: ${r.warnings} warning${r.warnings === 1 ? "" : "s"} (${r.checked})`, `  ${r.coverage}`, ...[...r.lines, ...r.notes].map((l) => "  " + l)];
    read = p.files;
  } catch {
    // (the art files it read before it failed)
    out = [`${f}: included only (doesn't build on its own: its palette comes from the file including it)`];
  }
  parentPort!.postMessage({ f, out, ms: Math.round(performance.now() - t0), files: read.map((a) => relative(root, a).split("\\").join("/")) });
});
