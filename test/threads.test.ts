// A pure field's march on more threads (src/node/threads.ts, surface.ts's spread): the hits on 1, 2 and 3 threads are
// the same bytes; a field with a plain closure is marched on this thread; a pure function that changes its data's
// arrays is still an error at its trace; an error thrown in a thread's march reaches the author as on one; the process
// ends by itself after a build, a check and a failed build. The workers' number where the guess is 3 or more, over
// sequences of commands in a record of the test's own: lowered on two readings, tried again, trusted, its log's bounds.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { root, whenChanged } from "./passed.ts";
import { loadSource } from "../src/node/load.ts";
import { kept, spread } from "../src/core/surface.ts";
import { guess, record, stats, workersFor, workersSaw } from "../src/node/threads.ts";

const test = whenChanged("test/threads.test.ts", ["bin/pxl.js"]);
// a ball given by its distance, `fn` the function (pure by default), traced over some 5000 cells (past SPREAD_MIN)
const art = (fn = "pure({ R, T }, (x, y, z) => Math.hypot(x, y, z - R) - R)") => `pal({ k: "#101010", a: "#404040", b: "#808080", c: "#c0c0c0" })
ramps("kabc")
const R = 3, T = [1, 2], d = ${fn}
sprite("ball", { w: 80, h: 80 }, surface(sdf.field(d, [-R, -R, 0], [R, R, 2 * R]), { ppm: 12 }))`;
/** The ball built on `threads` threads, the store asked to keep its trace (its hits, as put), and its pixels. */
const ball = (src: string, threads: number, name = `t${Math.random()}.px.js`) => {
  const was = { on: kept.on, trace: kept.trace, threads: spread.threads };
  let hits: Float64Array | undefined;
  kept.on = () => true; kept.trace = () => ({ put: (t) => { hits = t; } }); spread.threads = () => threads;
  try { const hash = loadSource(src, name).image("ball", 0, 0).hash(); return { hits, hash }; }
  finally { Object.assign(kept, { on: was.on, trace: was.trace }); spread.threads = was.threads; }
};
const bytes = (t?: Float64Array) => Buffer.from(t!.buffer, t!.byteOffset, t!.byteLength);

test("the hits of a pure field are the same bytes on 1, 2 and 3 threads, and so its pixels", () => {
  const one = ball(art(), 1), was = stats.spread;
  assert.ok(one.hits && one.hits.length > 4000);
  for (const k of [2, 3]) { const b = ball(art(), k); assert.ok(bytes(b.hits).equals(bytes(one.hits)), `${k} threads`); assert.equal(b.hash, one.hash); }
  assert.equal(stats.spread - was, 2, "both marched on more threads");
});

test("a field with a plain closure is marched on this thread", () => {
  const plain = art("(x, y, z) => Math.hypot(x, y, z - R) - R"), real = spread.march!;
  let asked = 0;
  spread.march = (P, r) => { asked++; return real(P, r); };
  try { assert.equal(ball(plain, 2).hash, ball(art(), 1).hash); } finally { spread.march = real; }
  assert.equal(asked, 0);
});

test("a pure function that changes its data's arrays is still an error at its trace", () => {
  const was = stats.here;
  assert.throws(() => ball(art("pure({ R, T }, (x, y, z) => { T[0] = x; return Math.hypot(x, y, z - R) - R })"), 2), /surface: pure: .* changed its data's 'T'/);
  assert.equal(stats.here - was, 1, "found by the threads, marched again here");
});

test("an error thrown in a thread's march reaches the author as on one thread", () => {
  // (thrown at a ray far into the trace, its x in the message: the first such ray, in the order one thread meets them)
  for (const body of ["x > 1.5 ? missing : Math.hypot(x, y, z - R) - R", "{ if (x > 1.5 && z > 2) throw new Error(`no ${x}, ${z}`); return Math.hypot(x, y, z - R) - R }"]) {
    const src = art(`pure({ R, T }, (x, y, z) => ${body})`), err = (k: number) => { try { ball(src, k, "err.px.js"); } catch (e) { return `${(e as Error).constructor.name}: ${(e as Error).message}`; } return "none"; };
    const one = err(1);
    assert.match(one, /^PxError: err\.px\.js:4:\d+: sprite 'ball' > surface: (pure: 'missing' is not in its data|no \d)/);
    assert.equal(err(2), one);
    assert.equal(err(3), one);
  }
});

test("the process ends by itself after a build, a check and a failed build on more threads", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-threads-")), ok = join(dir, "ok.px.js"), bad = join(dir, "bad.px.js");
  writeFileSync(ok, art());
  writeFileSync(bad, art("pure({ R, T }, (x, y, z) => { if (z > 5) throw new Error('a march that fails'); return Math.hypot(x, y, z - R) - R })"));
  const env = { ...process.env, PXL_THREADS: "2", PXL_CACHE: "0" };
  const run = (...a: string[]) => spawnSync(process.execPath, [join(root, "bin/pxl.js"), ...a], { env, encoding: "utf8", timeout: 60_000 });
  const build = run("build", ok, "--out", join(dir, "out"), "--profile"), check = run("check", ok), fail = run("build", bad, "--out", join(dir, "out"));
  for (const [r, code] of [[build, 0], [check, 0], [fail, 1]] as const) { assert.equal(r.error, undefined, "ended by itself"); assert.equal(r.status, code, r.stderr); }
  assert.match(build.stdout, /marched on 2 threads: forced, PXL_THREADS=2/);
  assert.match(fail.stderr, /a march that fails/);
});

test("the first number is a quarter of the machine's threads: 2 where it has 2, 8 at most", () => {
  assert.deepEqual([1, 2, 4, 8, 12, 16, 24, 64].map((t) => guess(t)), [1, 2, 2, 2, 3, 4, 6, 8]);
});

// (where the guess is 3 or more, as on a machine of 12 threads, the record in the test's own folder: a command's builds
// handed out took 20 s on one thread; the first command, on one thread, took 25 s, so 5 s of its own; a command on
// workers that took `ms` did one thread's work 25 / ms times as fast: 20 s 1.25x, 24 s 1.04x, 12 s 2.08x)
const top = 12, cost: Record<string, [number, number]> = { a: [20_000, 100] };
const saw = (id: string, k: number, ms: number, warm = false) => workersSaw(id, k, { work: 20_000, est: 0, ms, cost, warm, known: 20_000 }, top);
const n = (id: string) => workersFor(id, top).n, alone = (id: string) => !!workersFor(id, top).alone;
/** `fn` with the record in a folder of its own. */
const own = (fn: () => void) => () => {
  const was = record.file;
  record.file = join(mkdtempSync(join(tmpdir(), "pxl-record-")), "pxl-threads.json");
  try { fn(); } finally { record.file = was; }
};

test("where the guess is 3 or more: a file's first command on one thread, then the guess; one bad command among good ones lowers nothing, two in a row do", own(() => {
  assert.deepEqual([n("f"), alone("f")], [1, true], "the first on one thread, the march too");
  saw("f", 1, 25_000);
  assert.deepEqual([n("f"), alone("f")], [3, false], "then a quarter of 12");
  assert.deepEqual(workersFor("f", top).cost, cost, "each name's ms on one thread kept");
  assert.equal(saw("f", 3, 20_000), 25_000);
  saw("f", 3, 24_000);
  assert.equal(n("f"), 3, "one at 1.04x among good ones: kept");
  saw("f", 3, 20_000);
  saw("f", 3, 24_000);
  assert.equal(n("f"), 3, "bad, good, bad: kept");
  // (a command that found every build made says nothing of the next: no row, the number and the work stay)
  workersSaw("f", 3, { work: 0, est: 0, ms: 2_000 }, top);
  assert.equal(n("f"), 3);
  saw("f", 3, 24_000);
  assert.deepEqual([n("f"), alone("f")], [1, true], "two in a row under 1.15x: 3 to 1, the march on one too");
  assert.match(workersFor("f", top).why, /^1, lowered from 3 \(3 tried again in 8 commands\); its log: 6 commands with builds to share \(oldest first\) on one thread; 3 workers at 1\.25x one thread's speed; 3 workers at 1\.04x/);
  // (no command on one thread to judge by: not judged, and the next runs on one)
  assert.equal(saw("unknown", 3, 10_000), 0);
  assert.deepEqual([n("unknown"), alone("unknown")], [1, true]);
  assert.match(workersFor("unknown", top).why, /^on one thread again: .*3 workers not judged$/);
  workersSaw("little", 1, { work: 4_000, est: 5_000, ms: 5_000 }, top);
  assert.match(workersFor("little", top).why, /too few to share/, "under 10 s to share: none the next time");
}));

test("a lowered file is tried again after 8 commands, kept there when it pays, and the gap doubles when it doesn't, 64 at most", own(() => {
  saw("f", 1, 25_000); saw("f", 3, 24_000); saw("f", 3, 24_000);
  const ones = (k: number) => { for (let i = 0; i < k; i++) { assert.equal(n("f"), 1, `command ${i + 1} of ${k} on one`); saw("f", 1, 25_000); } };
  ones(8);
  assert.deepEqual([n("f"), alone("f")], [3, false], "after 8 on 1, one on 3");
  assert.match(workersFor("f", top).why, /^3 tried again after 8 commands on 1; /);
  for (const gap of [16, 32, 64, 64]) {
    saw("f", 3, 24_000);
    ones(gap);
    assert.equal(n("f"), 3, `the next try after ${gap}`);
  }
  // (a try with none on one thread made the same way to judge it: one on one thread, then the try again)
  saw("f", 3, 12_500, true);
  assert.equal(n("f"), 1);
  workersSaw("f", 1, { work: 12_000, est: 16_000, ms: 16_000, warm: true }, top);
  assert.equal(n("f"), 3);
  saw("f", 3, 20_000);
  assert.deepEqual([n("f"), alone("f")], [3, false], "1.25x: kept on 3");
  saw("f", 3, 24_000);
  assert.equal(n("f"), 3, "then one bad alone changes nothing");
}));

test("cold and warm apart: a command on workers is judged only against one on one thread made the same way", own(() => {
  saw("w", 1, 25_000);
  assert.equal(saw("w", 3, 12_500, true), 0, "warm (its traces read back): not judged against the cold command");
  assert.equal(n("w"), 1, "the next on one thread, warm");
  workersSaw("w", 1, { work: 12_000, est: 16_000, ms: 16_000, warm: true }, top);
  assert.equal(n("w"), 3);
  assert.equal(workersSaw("w", 3, { work: 12_000, est: 0, ms: 18_000, warm: true, known: 12_000 }, top), 16_000, "0.89x warm, against the warm 4 s of its own");
  assert.equal(saw("w", 3, 20_000), 25_000, "1.25x cold, against the cold 5 s");
  assert.equal(workersSaw("w", 3, { work: 12_000, est: 0, ms: 18_000, warm: true, known: 12_000 }, top), 16_000);
  assert.equal(n("w"), 3, "the last two judged at 3: 1.25x and 0.89x");
}));

test("a machine is trusted after two commands judged on its full guess read 2x, not one, and loses it after three under 1.15x", own(() => {
  // (the readings of several files are ordered by when they were written: each a few ms after the one before)
  const saw = (id: string, k: number, ms: number, warm = false) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3); return workersSaw(id, k, { work: 20_000, est: 0, ms, cost, warm, known: 20_000 }, top); };
  saw("a", 1, 25_000); saw("a", 3, 12_000);
  assert.deepEqual([n("new"), alone("new")], [1, true], "one reading of 2.08x: a new file's first command on one thread");
  saw("b", 1, 25_000); saw("b", 3, 12_000);
  assert.deepEqual([n("new"), alone("new")], [3, false], "two: a new file's first command on the guess");
  assert.match(workersFor("new", top).why, /a machine trusted: 2 commands judged on its 3 workers did one thread's work 2x as fast or more \(2\.08x, 2\.08x\)/);
  // (a warm run with no warm command on one thread: not judged, and none on one thread asked)
  saw("new", 3, 10_000, true);
  assert.equal(n("new"), 3);
  saw("a", 3, 24_000); saw("b", 3, 24_000);
  assert.equal(n("other"), 3, "two under 1.15x: still trusted");
  saw("a", 3, 24_000);
  assert.deepEqual([n("other"), alone("other")], [1, true], "three: no longer");
  // (the readings from before count no more: one more 2x is one)
  saw("b", 3, 12_000);
  assert.equal(n("other"), 1);
  saw("b", 3, 12_000);
  assert.equal(n("other"), 3, "two after it: trusted again");
}));

test("a file's log keeps its last 16 commands; the record its 200 files seen last, none unseen for 30 days", own(() => {
  for (let i = 0; i < 20; i++) saw("f", 1, 25_000);
  const rec = () => JSON.parse(readFileSync(record.file, "utf8"));
  assert.equal(rec().files.f.rows.length, 16);
  for (let i = 0; i < 205; i++) saw(`g${i}`, 1, 25_000);
  const files = Object.keys(rec().files);
  assert.equal(files.length, 200);
  assert.ok(files.includes("g204") && !files.includes("f") && !files.includes("g3"), "the oldest dropped");
  const r = rec();
  for (const w of r.files.g204.rows) w[0] -= 31 * 86_400_000;
  writeFileSync(record.file, JSON.stringify(r));
  saw("h", 1, 25_000);
  assert.ok(!rec().files.g204 && rec().files.h, "not seen for 31 days: dropped");
}));
