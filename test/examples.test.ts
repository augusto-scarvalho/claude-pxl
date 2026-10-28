// What `pxl check` says about every example, kept in test/examples.checks.txt: a change to a check (or
// to an example) that adds or removes a warning anywhere, or what the checks could run on, shows up here.
// The two warnings today are known: the knights scene shows a flipped knight beside the turned one, lit
// from the wrong side (its lesson); the cemetery's crypt is misread (its outline is mostly trims: the
// cornice, the steps; its columns are lit from the right, as the scene is); no_magic's ramps branch at
// its dark stone (stone and paper) and its dark rose (cloth and fire), and its lights step through them.
// The parts of a pipeline (`pipeline/part_*.px.js`) are left out: their test_* scenes are scaffolding
// (a whole 240-frame street each, minutes of checking), and their assets are checked where the
// pipeline's scene places them. The library's files (lib/) are checked too, by their path from the repo
// ("lib/nature/kit.px.js"); a stub left at an old path ("// Moved to lib/...") is its lib file's, checked
// there, and the second test here says it defines exactly that file's names.
// After a change you meant, rewrite the file: PXL_UPDATE=1 node --test test/examples.test.ts
// While working on some examples, check only those: PXL_EXAMPLES=hd2d (or hd2d/harbor, or several,
// comma-separated: the start of each path under examples/, or lib/nature) compares and rewrites only
// their lines; the test's name says how many it left out, and `npm test` checks them all. How long
// each took is kept in node_modules/.cache/pxl/examples-times.json, to hand out the slowest first next time.
// An example whose check said its kept lines is noted there too (examples-passed.json), with a hash of
// what the check read (pxl's sources, Node's version, this test, the example and every file it read):
// the next run checks only the examples whose hash changed (one edited: that one; pxl's sources: all)
// and says how many it left alone. Delete examples-passed.json there to check them all anyway.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { fingerprint, pass, passed, root } from "./passed.ts";
import { loadProject } from "../src/node/load.ts";

const SNAP = join(root, "test", "examples.checks.txt");
const key = (files: string[]) => fingerprint(["test/examples.test.ts", "test/check.worker.ts", ...files]);
const walk = (dir: string) => (readdirSync(join(root, dir), { recursive: true }) as string[])
  .map((f) => f.split("\\").join("/")).filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out") && !/(^|\/)pipeline\/part_/.test(f)).sort();
const stub = (f: string) => readFileSync(join(root, "examples", f), "utf8").startsWith("// Moved to lib/");
const all = [...walk("examples").filter((f) => !stub(f)), ...walk("lib").map((f) => `lib/${f}`)];
const only = process.env.PXL_EXAMPLES?.split(",").map((s) => s.trim()).filter(Boolean);
const files = only ? all.filter((f) => only.some((o) => f.startsWith(o))) : all;

test(`pxl check on ${only ? `${files.length} of the ${all.length} examples (PXL_EXAMPLES=${only.join(",")})` : "every example"}: the same warnings as kept`, async (t) => {
  assert.ok(files.length, `PXL_EXAMPLES=${only} matches no example (paths under examples/, e.g. hd2d or hd2d/harbor)`);
  // the kept lines, by file: a file's first line starts at the margin, the rest are indented
  const kept = existsSync(SNAP) ? readFileSync(SNAP, "utf8") : "", blocks = new Map<string, string[]>();
  for (const l of kept.split("\n").filter(Boolean)) if (l.startsWith(" ")) blocks.get([...blocks.keys()].pop()!)!.push(l); else blocks.set(l.slice(0, l.indexOf(": ")), [l]);
  // each example checked in one of a few threads (check.worker.ts), handed out as they finish, the
  // slowest last time first (else the most frames, as the kept file counts them): the longest doesn't start last
  const frames = (f: string) => +(/\((\d+) frames/.exec(blocks.get(f)?.[0] ?? "")?.[1] ?? 1e9);
  let took: Record<string, number> = {}, before: Record<string, { files: string[]; key: string; said: string[] }> = {};
  try { took = JSON.parse(passed("examples-times.json")); } catch { /* the first run */ }
  try { before = JSON.parse(passed("examples-passed.json")); } catch { /* the first run */ }
  // checked again: the examples not known to say their kept lines with what they read now
  const same = (a?: string[], b?: string[]) => (a ?? []).join("\n") === (b ?? []).join("\n");
  const run = files.filter((f) => !before[f] || !same(before[f].said, blocks.get(f)) || before[f].key !== key(before[f].files));
  const said = new Map<string, string[]>(), read = new Map<string, string[]>();
  const text = (fs: string[]) => fs.flatMap((f) => said.get(f) ?? blocks.get(f) ?? []).join("\n") + "\n";
  // (and the kept file holds no example that's gone)
  if (!run.length && !process.env.PXL_UPDATE && (only || text(files) === kept)) return t.skip("nothing their checks read changed since they last passed");
  if (run.length < files.length) t.diagnostic(`${files.length - run.length} of ${files.length} examples left alone: nothing their checks read changed since they last passed`);
  const cost = (f: string) => took[f] ?? 1e9 + frames(f), queue = [...run].sort((a, b) => cost(b) - cost(a));
  const workers = Array.from({ length: Math.max(1, Math.min(run.length, Math.floor(availableParallelism() / 4))) }, () => new Worker(new URL("./check.worker.ts", import.meta.url)));
  try {
    await Promise.all(workers.map((w) => new Promise<void>((done, fail) => {
      const next = () => { const f = queue.shift(); if (f === undefined) done(); else w.postMessage({ root, f }); };
      w.on("message", ({ f, out, ms, files }: { f: string; out: string[]; ms: number; files: string[] }) => { said.set(f, out); took[f] = ms; read.set(f, files); next(); });
      w.on("error", fail);
      next();
    })));
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  pass("examples-times.json", JSON.stringify(took));
  const update = process.env.PXL_UPDATE || !existsSync(SNAP);
  if (update) writeFileSync(SNAP, text(all));
  // each example checked that passed (said its kept lines, or wrote them) noted with what its check read
  for (const f of run) {
    if (update || same(said.get(f), blocks.get(f))) before[f] = { files: read.get(f)!, key: key(read.get(f)!), said: said.get(f)! };
    else delete before[f];
  }
  pass("examples-passed.json", JSON.stringify(before));
  assert.equal(text(files), only ? files.flatMap((f) => blocks.get(f) ?? []).join("\n") + "\n" : kept);
});

test("a stub left at an old path defines exactly the names of the lib file it includes (loaded, not drawn)", () => {
  const names = (f: string) => { const p = loadProject(f); return [...p.assets.keys(), ...p.groups.keys(), ...p.fonts.keys(), ...p.sheets.map((s) => s.name)]; };
  for (const f of walk("examples").filter(stub)) {
    const at = join(root, "examples", f), text = readFileSync(at, "utf8"), to = /^include\("([^"]+)"/m.exec(text)?.[1] ?? "";
    assert.ok(to.endsWith(/^\/\/ Moved to (\S+\.px\.js)/.exec(text)![1]), `${f}: includes the lib file its first line names`);
    assert.deepEqual(names(at), names(resolve(dirname(at), to)), f);
  }
});
