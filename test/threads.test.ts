// A pure field's march on more threads (src/node/threads.ts, surface.ts's spread): the hits on 1, 2 and 3 threads are
// the same bytes; a field with a plain closure is marched on this thread; a pure function that changes its data's
// arrays is still an error at its trace; an error thrown in a thread's march reaches the author as on one; the process
// ends by itself after a build, a check and a failed build.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { root, whenChanged } from "./passed.ts";
import { loadSource } from "../src/node/load.ts";
import { kept, spread } from "../src/core/surface.ts";
import { stats } from "../src/node/threads.ts";

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
