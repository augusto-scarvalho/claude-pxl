// What `pxl check` says about every example, kept in test/examples.checks.txt: a change to a check (or
// to an example) that adds or removes a warning anywhere, or what the checks could run on, shows up here.
// The two warnings today are known: the knights scene shows a flipped knight beside the turned one, lit
// from the wrong side (its lesson); the cemetery's crypt is misread (its outline is mostly trims: the
// cornice, the steps; its columns are lit from the right, as the scene is); no_magic's ramps branch at
// its dark stone (stone and paper) and its dark rose (cloth and fire), and its lights step through them.
// The parts of a pipeline (`pipeline/part_*.px.js`) are left out: their test_* scenes are scaffolding
// (a whole 240-frame street each, minutes of checking), and their assets are checked where the
// pipeline's scene places them.
// After a change you meant, rewrite the file: PXL_UPDATE=1 node --test test/examples.test.ts
// While working on some examples, check only those: PXL_EXAMPLES=hd2d (or hd2d/harbor, or several,
// comma-separated: the start of each path under examples/) compares and rewrites only their lines; the
// test's name says how many it left out, and `npm test` checks them all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP = join(root, "test", "examples.checks.txt");
const all = (readdirSync(join(root, "examples"), { recursive: true }) as string[])
  .map((f) => f.split("\\").join("/")).filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out") && !/(^|\/)pipeline\/part_/.test(f)).sort();
const only = process.env.PXL_EXAMPLES?.split(",").map((s) => s.trim()).filter(Boolean);
const files = only ? all.filter((f) => only.some((o) => f.startsWith(o))) : all;

test(`pxl check on ${only ? `${files.length} of the ${all.length} examples (PXL_EXAMPLES=${only.join(",")})` : "every example"}: the same warnings as kept`, async () => {
  assert.ok(files.length, `PXL_EXAMPLES=${only} matches no example (paths under examples/, e.g. hd2d or hd2d/harbor)`);
  // the kept lines, by file: a file's first line starts at the margin, the rest are indented
  const kept = existsSync(SNAP) ? readFileSync(SNAP, "utf8") : "", blocks = new Map<string, string[]>();
  for (const l of kept.split("\n").filter(Boolean)) if (l.startsWith(" ")) blocks.get([...blocks.keys()].pop()!)!.push(l); else blocks.set(l.slice(0, l.indexOf(": ")), [l]);
  // each example checked in one of a few threads (check.worker.ts), handed out as they finish, the most
  // frames (as the kept file counts them) first: the longest doesn't start last
  const frames = (f: string) => +(/\((\d+) frames/.exec(blocks.get(f)?.[0] ?? "")?.[1] ?? 1e9);
  const said = new Map<string, string[]>(), queue = [...files].sort((a, b) => frames(b) - frames(a));
  const workers = Array.from({ length: Math.max(1, Math.min(files.length, availableParallelism())) }, () => new Worker(new URL("./check.worker.ts", import.meta.url)));
  try {
    await Promise.all(workers.map((w) => new Promise<void>((done, fail) => {
      const next = () => { const f = queue.shift(); if (f === undefined) done(); else w.postMessage({ root, f }); };
      w.on("message", ({ f, out }: { f: string; out: string[] }) => { said.set(f, out); next(); });
      w.on("error", fail);
      next();
    })));
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  const text = (fs: string[]) => fs.flatMap((f) => said.get(f) ?? blocks.get(f) ?? []).join("\n") + "\n";
  if (process.env.PXL_UPDATE || !existsSync(SNAP)) writeFileSync(SNAP, text(all));
  assert.equal(text(files), only ? files.flatMap((f) => blocks.get(f) ?? []).join("\n") + "\n" : kept);
});
