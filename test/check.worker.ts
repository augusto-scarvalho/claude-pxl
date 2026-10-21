// One example's `pxl check` lines, in a thread of its own: examples.test.ts hands the examples out to
// as many of these as the machine has cores (the scenes checked frame by frame take seconds each).
import { parentPort } from "node:worker_threads";
import { basename, join } from "node:path";
import { loadProject } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";

parentPort!.on("message", ({ root, f }: { root: string; f: string }) => {
  let out: string[];
  try {
    const p = loadProject(join(root, "examples", f), { checksOnly: true });
    // every frame of every animated scene (the bout's blows, the blocks, the last clash included)
    const r = checkProject(p, { file: basename(f) });
    out = [`${f}: ${r.warnings} warning${r.warnings === 1 ? "" : "s"} (${r.checked})`, `  ${r.coverage}`, ...[...r.lines, ...r.notes].map((l) => "  " + l)];
  } catch {
    out = [`${f}: included only (doesn't build on its own: its palette comes from the file including it)`];
  }
  parentPort!.postMessage({ f, out });
});
