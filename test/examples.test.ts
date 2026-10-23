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
// test's name says how many it left out, and `npm test` checks them all. How long each took is kept
// in node_modules/.cache/pxl/examples-times.json, to hand out the slowest first next time.
// A whole run that passed keeps a fingerprint of what the check reads (pxl's sources, the examples,
// this test and the kept lines, Node's version) beside it: the next run with nothing of that changed
// (a commit of docs only) is skipped, saying so. Delete examples-passed.txt there to run it anyway.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP = join(root, "test", "examples.checks.txt"), TIMES = join(root, "node_modules", ".cache", "pxl", "examples-times.json");
const PASSED = join(dirname(TIMES), "examples-passed.txt");
const fingerprint = () => {
  const h = createHash("sha1").update(process.version);
  const under = (d: string) => (readdirSync(join(root, d), { recursive: true }) as string[]).map((f) => join(d, f)).filter((f) => !f.split(/[\\/]/).includes("out"));
  for (const f of [...under("src"), ...under("examples"), "test/examples.test.ts", "test/check.worker.ts", "test/examples.checks.txt"].sort()) {
    const p = join(root, f);
    if (statSync(p).isFile()) h.update(f).update(readFileSync(p));
  }
  return h.digest("hex");
};
const all = (readdirSync(join(root, "examples"), { recursive: true }) as string[])
  .map((f) => f.split("\\").join("/")).filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out") && !/(^|\/)pipeline\/part_/.test(f)).sort();
const only = process.env.PXL_EXAMPLES?.split(",").map((s) => s.trim()).filter(Boolean);
const files = only ? all.filter((f) => only.some((o) => f.startsWith(o))) : all;

test(`pxl check on ${only ? `${files.length} of the ${all.length} examples (PXL_EXAMPLES=${only.join(",")})` : "every example"}: the same warnings as kept`, async (t) => {
  if (!only && !process.env.PXL_UPDATE && existsSync(PASSED) && readFileSync(PASSED, "utf8") === fingerprint()) return t.skip("nothing it reads changed since it last passed");
  assert.ok(files.length, `PXL_EXAMPLES=${only} matches no example (paths under examples/, e.g. hd2d or hd2d/harbor)`);
  // the kept lines, by file: a file's first line starts at the margin, the rest are indented
  const kept = existsSync(SNAP) ? readFileSync(SNAP, "utf8") : "", blocks = new Map<string, string[]>();
  for (const l of kept.split("\n").filter(Boolean)) if (l.startsWith(" ")) blocks.get([...blocks.keys()].pop()!)!.push(l); else blocks.set(l.slice(0, l.indexOf(": ")), [l]);
  // each example checked in one of a few threads (check.worker.ts), handed out as they finish, the
  // slowest last time first (else the most frames, as the kept file counts them): the longest doesn't start last
  const frames = (f: string) => +(/\((\d+) frames/.exec(blocks.get(f)?.[0] ?? "")?.[1] ?? 1e9);
  let took: Record<string, number> = {};
  try { took = JSON.parse(readFileSync(TIMES, "utf8")); } catch { /* the first run */ }
  const cost = (f: string) => took[f] ?? 1e9 + frames(f);
  const said = new Map<string, string[]>(), queue = [...files].sort((a, b) => cost(b) - cost(a));
  const workers = Array.from({ length: Math.max(1, Math.min(files.length, Math.floor(availableParallelism() / 4))) }, () => new Worker(new URL("./check.worker.ts", import.meta.url)));
  try {
    await Promise.all(workers.map((w) => new Promise<void>((done, fail) => {
      const next = () => { const f = queue.shift(); if (f === undefined) done(); else w.postMessage({ root, f }); };
      w.on("message", ({ f, out, ms }: { f: string; out: string[]; ms: number }) => { said.set(f, out); took[f] = ms; next(); });
      w.on("error", fail);
      next();
    })));
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  try { mkdirSync(dirname(TIMES), { recursive: true }); writeFileSync(TIMES, JSON.stringify(took)); } catch { /* only an order */ }
  const text = (fs: string[]) => fs.flatMap((f) => said.get(f) ?? blocks.get(f) ?? []).join("\n") + "\n";
  if (process.env.PXL_UPDATE || !existsSync(SNAP)) writeFileSync(SNAP, text(all));
  assert.equal(text(files), only ? files.flatMap((f) => blocks.get(f) ?? []).join("\n") + "\n" : kept);
  if (!only) try { writeFileSync(PASSED, fingerprint()); } catch { /* only a shortcut */ }
});
