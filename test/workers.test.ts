// Whole builds made by worker threads (src/node/workers.ts): with 1, 2 and 3 workers every file written, every warning
// (its order, the assets it names) and check's lines the same, an inner anim's frame 0 that warns, read only for its
// timeline by a worker, included; a build the store wouldn't serve made here (the art's dice; a scene's frame, which may
// carry another build's work in a memo of its own, never handed out); an error thrown by the art in a worker is today's;
// the process ends by itself after a build, a check and a failed build; a command inside a worker thread starts none.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { root, whenChanged } from "./passed.ts";
import { loadProject } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { startWorkers, stats } from "../src/node/workers.ts";

const test = whenChanged("test/workers.test.ts", ["bin/pxl.js"]);
process.env.PXL_CACHE = "0";
const dir = mkdtempSync(join(tmpdir(), "pxl-workers-")), at = (f: string) => join(dir, f);
// _part's frame 0 warns (a stamp off its canvas); move's frames stamp its frames, other's too, and other's frame 2 warns;
// each of _part's frames takes some 100 ms (spin: the workers have time to start and take some)
const ART = `pal({ k: "#101010", r: "#c03030", g: "#30c030", b: "#3030c0", w: "#f0f0f0" })
sprite("far", { w: 2, h: 2, pivot: [20, 0] }, (c) => c.rect(0, 0, 2, 2, "r"))
const spin = () => { let s = 0; for (let i = 0; i < 2e7; i++) s += i % 7; return s }
anim("_part", { w: 6, h: 6, frames: 8 }, (c) => { if (c.frame === 0) c.stamp("far", 1, 1); c.rect(c.frame % 5, 1, 2, 2, spin() < 0 ? "r" : "g") })
anim("move", { w: 8, h: 8, frames: 8 }, (c) => { c.stamp("_part", 1, 1, { frame: c.frame }); c.px(c.frame % 8, 0, "w") })
anim("other", { w: 8, h: 8, frames: 6 }, (c) => { c.stamp("_part", 0, 0, { frame: 7 - c.frame }); if (c.frame === 2) c.stamp("far", 3, 2); c.px(0, c.frame, "b") })
`;
writeFileSync(at("fig.px.js"), ART);
const env = (n: number) => ({ ...process.env, PXL_WORKERS: String(n), PXL_CACHE: "0" });
const run = (n: number, ...a: string[]) => spawnSync(process.execPath, [join(root, "bin/pxl.js"), ...a], { env: env(n), encoding: "utf8", timeout: 60_000 });
/** Every file under a folder, by its path: its bytes as base64. */
const files = (d: string) => Object.fromEntries((readdirSync(d, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => [join(e.parentPath, e.name).slice(d.length), readFileSync(join(e.parentPath, e.name)).toString("base64")]));
/** A build of the file in this process on n workers: its warnings with the assets each names, and what it wrote. */
const built = (file: string, n: number) => {
  const was = process.env.PXL_WORKERS;
  process.env.PXL_WORKERS = String(n);
  try {
    const p = loadProject(at(file)), out = at(`in-${file}-${n}`);
    startWorkers(p, at(file), {}, "build");
    const r = writeOutputs(p, out);
    return { warnings: p.warnings.map((w) => [w.msg, w.loc, [...(w.by ?? [])].sort()]), lines: r.lines, errors: r.errors.map((e) => e.message), files: files(out), p };
  } finally { if (was === undefined) delete process.env.PXL_WORKERS; else process.env.PXL_WORKERS = was; }
};

test("with 1, 2 and 3 workers every file, every warning (its place, its assets) and check's lines are the same", () => {
  const one = built("fig.px.js", 1);
  assert.equal(one.warnings.length, 2, "both warnings, _part's frame 0's first");
  for (const n of [2, 3]) {
    const b = built("fig.px.js", n);
    assert.ok(stats.served > 0, `${n} workers made builds`);
    assert.equal(b.p.refused, 0, "each served: what it asked held here, or sent with it");
    assert.deepEqual(b.warnings, one.warnings, `${n} workers: the warnings`);
    assert.deepEqual(b.files, one.files, `${n} workers: the files`);
    assert.deepEqual(b.lines, one.lines);
  }
  const cli = (n: number) => { const b = run(n, "build", at("fig.px.js"), "--out", at(`cli-${n}`)), c = run(n, "check", at("fig.px.js")); return { b: b.stdout.replace(/-> .*/, "") + b.stderr, c: c.stdout + c.stderr, files: files(at(`cli-${n}`)) }; };
  const c1 = cli(1);
  for (const n of [2, 3]) assert.deepEqual(cli(n), c1, `${n} workers: pxl build's and check's text and files`);
});

test("a build after the art's own dice is made here, and so is everything after it; a scene's frame is never handed out", () => {
  writeFileSync(at("dice.px.js"), ART + `anim("roll", { w: 4, h: 4, frames: 6 }, (c) => { if (c.frame === 3) Math.random(); c.px(c.frame % 4, 0, "w") })
scene("show", { w: 12, h: 12, frames: 4 }, (c) => c.stamp("move", 2, 2, { frame: c.frame }))
`);
  const one = built("dice.px.js", 1), two = built("dice.px.js", 2);
  assert.deepEqual(two.files, one.files);
  assert.deepEqual(two.warnings, one.warnings);
  assert.ok(two.p.early && stats.here > 0, "roll's frame 3 made here, the disk let go");
  assert.ok(!two.p.elsewhere!.isJob("show#250") && !two.p.elsewhere!.isJob("show"), "the scene's frames stay here");
});

test("a build made here or served, dropped from memory and asked again, is made here at once (no wait for a worker)", () => {
  const one = built("fig.px.js", 1), was = process.env.PXL_WORKERS;
  process.env.PXL_WORKERS = "2";
  try {
    // (timedBytes 1: each frame dropped as the next is kept, so the second pass asks every one again)
    const p = loadProject(at("fig.px.js"), { timedBytes: 1 }), t0 = performance.now();
    startWorkers(p, at("fig.px.js"), { timedBytes: 1 }, "build");
    writeOutputs(p, at("again-a"));
    assert.ok(stats.served > 0 && stats.here > 0, "some served, some made here");
    writeOutputs(p, at("again-b"));
    assert.ok(performance.now() - t0 < 60_000, "none waited for");
    assert.deepEqual(files(at("again-a")), one.files);
    assert.deepEqual(files(at("again-b")), one.files);
  } finally { if (was === undefined) delete process.env.PXL_WORKERS; else process.env.PXL_WORKERS = was; }
});

test("an error thrown by the art in a worker is today's error, at the same place", () => {
  writeFileSync(at("bad.px.js"), ART + `anim("bad", { w: 4, h: 4, frames: 4 }, (c) => { if (c.frame === 2) throw new Error("frame two fails"); c.px(0, 0, "w") })
`);
  const one = built("bad.px.js", 1);
  assert.match(one.errors.join("\n"), /bad\.px\.js:\d+:\d+: .*frame two fails/s);
  for (const n of [2, 3]) { const b = built("bad.px.js", n); assert.deepEqual(b.errors, one.errors); assert.deepEqual(b.files, one.files); }
});

test("the process ends by itself after a build, a check and a failed build on workers", () => {
  const build = run(2, "build", at("fig.px.js"), "--out", at("end"), "--profile"), check = run(2, "check", at("fig.px.js")), fail = run(2, "build", at("bad.px.js"), "--out", at("end2"));
  for (const [r, code] of [[build, 0], [check, 1], [fail, 1]] as const) { assert.equal(r.error, undefined, "ended by itself"); assert.equal(r.status, code, r.stderr); }
  assert.match(build.stdout, /builds made by 2 workers: forced, PXL_WORKERS=2 \(\d+ of \d+ handed out served/);
  assert.match(fail.stderr, /frame two fails/);
});

test("a command inside a worker thread starts no workers", async () => {
  const src = `const { workerData, parentPort } = require("node:worker_threads");
import(workerData.load).then(async ({ loadProject }) => { const w = await import(workerData.workers); const p = loadProject(workerData.file); w.startWorkers(p, workerData.file, {}, "build"); parentPort.postMessage([w.stats.n, !!p.elsewhere]); });`;
  const said = await new Promise((ok, no) => new Worker(src, { eval: true, env: env(3), workerData: { file: at("fig.px.js"), load: new URL("../src/node/load.ts", import.meta.url).href, workers: new URL("../src/node/workers.ts", import.meta.url).href } }).on("message", ok).on("error", no));
  assert.deepEqual(said, [1, false]);
});
