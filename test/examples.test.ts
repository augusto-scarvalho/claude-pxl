// What `pxl check` says about every example, kept in test/examples.checks.txt: a change to a check (or
// to an example) that adds or removes a warning anywhere, or what the checks could run on, shows up here.
// The two warnings today are known: the knights scene shows a flipped knight beside the turned one, lit
// from the wrong side (its lesson); the cemetery's crypt is misread (its outline is mostly trims: the
// cornice, the steps; its columns are lit from the right, as the scene is); no_magic's ramps branch at
// its dark stone (stone and paper) and its dark rose (cloth and fire), and its lights step through them.
// The parts of a pipeline (`pipeline/part_*.px.js`) are left out: their test_* scenes are scaffolding
// (a whole 240-frame street each, minutes of checking), and their assets are checked where the
// pipeline's scene places them.
// After a change you meant, rewrite the file: PXL_UPDATE=1 npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP = join(root, "test", "examples.checks.txt");

test("pxl check on every example: the same warnings as kept", async () => {
  const files = (readdirSync(join(root, "examples"), { recursive: true }) as string[])
    .map((f) => f.split("\\").join("/")).filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out") && !/(^|\/)pipeline\/part_/.test(f)).sort();
  // each example checked in one of a few threads (check.worker.ts), handed out as they finish, the most
  // frames (as the kept file counts them) first: the longest doesn't start last
  const kept = existsSync(SNAP) ? readFileSync(SNAP, "utf8") : "", frames = (f: string) => +(new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: .*?\\((\\d+) frames`, "m").exec(kept)?.[1] ?? 1e9);
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
  const text = files.flatMap((f) => said.get(f)!).join("\n") + "\n";
  if (process.env.PXL_UPDATE || !existsSync(SNAP)) writeFileSync(SNAP, text);
  assert.equal(text, readFileSync(SNAP, "utf8"));
});
