// What a trace's march finds, kept under its field's key (surface.ts's kept, src/node/store.ts), and pure(), which makes a
// field given by a function keyable (src/node/pure.ts): a pure function reads its arguments, Math and its data alone
// (any other name is an error that says what to do); the same field asked from two files, or from one before and after
// an unrelated edit, marches once; a change to its source, its data, the view, the size or a ray's step marches again;
// a field of a plain closure is never kept; a broken entry is marched again; the store off gives the same pixels.
import assert from "node:assert/strict";
import { mkdtempSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whenChanged } from "./passed.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { DIR, encode, sha1, traceKey } from "../src/node/store.ts";
import { kept } from "../src/core/surface.ts";

const test = whenChanged("test/trace.test.ts");
const text = (v: unknown) => { const bufs: ArrayBufferView[] = []; return JSON.stringify(encode(v, bufs)) + bufs.map((b) => Buffer.from(b.buffer).toString("base64")).join(); };

// every trace kept, as if each took long; what each asked counted, and the entries it wrote
const real = kept.trace!, n = { asked: 0, marched: 0, read: 0 }, files: string[] = [];
kept.trace = (k, r) => {
  const o = real(k, r);
  if (!o) return o;
  n.asked++;
  if (o.t) n.read++; else n.marched++;
  return { t: o.t, put: (t) => { o.put(t, 1e6); files.push(join(DIR, sha1(traceKey(k, r)!))); } };
};
const dir = mkdtempSync(join(tmpdir(), "pxl-trace-")), salt = Math.random();
// a ball given by its distance, pure; `body` the function's source, `opts` surface()'s, `more` the rest of the file
const art = (o: { body?: string; R?: number; opts?: string; w?: number; more?: string } = {}) => `pal({ k: "#101010", a: "#404040", b: "#808080", c: "#c0c0c0" })
ramps("kabc")
const R = ${o.R ?? 3}, SALT = ${salt}
const d = pure({ R, SALT }, (x, y, z) => ${o.body ?? "Math.hypot(x, y, z - R) - R"})
sprite("ball", { w: ${o.w ?? 24}, h: 24 }, surface(sdf.field(d, [-R, -R, 0], [R, R, 2 * R]), ${o.opts ?? "{ ppm: 3 }"}))
${o.more ?? ""}`;
/** The ball built from a file holding `src` (no build kept: each is made), and what its trace did. */
const ball = (name: string, src: string) => {
  writeFileSync(join(dir, name), src);
  const p = loadProject(join(dir, name)), was = { ...n };
  p.disk = undefined;
  const out = text(p.build("ball"));
  return { out, marched: n.marched - was.marched, read: n.read - was.read, asked: n.asked - was.asked };
};

test("a pure function reads its arguments, Math and its data alone: another name says what to do", () => {
  const p = loadSource(`const R = 3, d = pure({}, (x) => x - R)\nsprite("s", { w: 2, h: 2 }, (c) => { d(1) })`);
  assert.throws(() => p.build("s"), /'R' is not in its data.*pure\(\{ R, \.\.\. \}, fn\)/);
  for (const [body, what] of [["Date.now()", /'Date' is not in its data/], ["Math.random()", /Math\.random throws dice/], ["(seen = x)", /it writes 'seen'/]] as const) {
    const q = loadSource(`const d = pure({}, (x) => ${body})\nsprite("s", { w: 2, h: 2 }, (c) => { d(1) })`);
    assert.throws(() => q.build("s"), what);
  }
  // its data: numbers, arrays and plain objects of them (copied, frozen), fields, pure functions; not a plain closure
  assert.throws(() => loadSource(`const f = (x) => x\npure({ f }, (x) => f(x))`), /'f' is a function that isn't pure/);
  // (its data's objects frozen; its arrays plain and checked at its traces, below)
  const r = loadSource(`const T = { a: 1 }, g = pure({ T }, (h) => { T.a = h; return T.a })\nsprite("s", { w: 2, h: 2 }, (c) => { g(5) })`);
  assert.throws(() => r.build("s"), /read only|read-only|Cannot assign/);
  // nothing kept from one call to the next: its data's names and Math are constants, all it can reach frozen (a
  // function expression's prototype, the iterators'), its errors without the caller's stack
  for (const [fn, what] of [["pure({ n: 0 }, () => n++)", /Assignment to constant/], ["pure({}, () => { Math = { sin: () => 7 }; return Math.sin(0) })", /Assignment to constant/],
    ["pure({}, function f() { f.prototype.n = (f.prototype.n ?? 0) + 1; return f.prototype.n })", /not extensible/],
    ["pure({}, () => { const P = ({}).constructor.getPrototypeOf([].values()); P.n = (P.n ?? 0) + 1; return P.n })", /not extensible/],
    // (no way to its scope's global, whose one slot is fixed; an error it catches is its scope's own, frozen, not pxl's)
    ["pure({}, () => { const g = (() => 0).constructor('return this')(); g.Error = 1 })", /Code generation from strings/],
    ["pure({}, () => { try { return missing } catch (e) { return typeof e.constructor.constructor('return process')() } })", /Code generation from strings/],
    ["pure({}, () => { try { return missing } catch (e) { const p = e.constructor.prototype; p.n = (p.n ?? 0) + 1; return p.n } })", /not extensible/]] as const) {
    const q = loadSource(`const d = ${fn}\nsprite("s", { w: 2, h: 2 }, (c) => { d(); d(); d() })`);
    assert.throws(() => q.build("s"), what, fn);
  }
  assert.throws(() => loadSource(`pure({}, () => import("node:fs"))`), /the word 'import' is in it/);
  loadSource(`const d = pure({}, () => new Error("x").stack)\nsprite("s", { w: 2, h: 2 }, (c) => { if (d() !== "Error: x") throw new Error("a stack") })`).build("s");
});

test("the same field marches once, whatever file asks it and whatever else that file holds", () => {
  const a = ball("a.px.js", art());
  assert.deepEqual([a.asked, a.marched], [1, 1]);
  const b = ball("b.px.js", art({ more: `sprite("other", { w: 4, h: 4 }, rect(0, 0, 4, 4, "a"))` }));
  assert.deepEqual([b.marched, b.read], [0, 1]);
  const c = ball("a.px.js", art({ more: "// an edit" }));
  assert.deepEqual([c.marched, c.read], [0, 1]);
  assert.equal(b.out, a.out);
  assert.equal(c.out, a.out);
  // the store off: the same pixels, nothing asked of it
  process.env.PXL_CACHE = "0";
  try { const off = ball("a.px.js", art()); assert.equal(off.asked, 0); assert.equal(off.out, a.out); } finally { delete process.env.PXL_CACHE; }
});

test("a change to the function's source, its data, the view, the size or a ray's step marches again", () => {
  ball("c.px.js", art());
  // (the size: a sprite that cuts the ball; one only wider round the same rays is the same trace)
  for (const o of [{ body: "Math.hypot(x, y, z - R) - R * 1" }, { R: 3.5 }, { opts: `{ ppm: 3, view: "top" }` }, { opts: "{ ppm: 4 }" }, { w: 12 }, { opts: "{ ppm: 3, pixel: 2 }" }])
    assert.deepEqual(ball("c.px.js", art(o)).marched, 1, JSON.stringify(o));
});

// (its arrays stay plain, read fast: checked at each trace that reads or keeps hits, and after its march)
test("a pure function that changes its data's arrays is an error at its trace, nothing kept", () => {
  const src = (w: string, before = "") => `pal({ k: "#101010", a: "#404040", b: "#808080", c: "#c0c0c0" })
ramps("kabc")
const R = 3, d = pure({ R, T: [1, [2, 3]], SALT: ${salt} }, (x, y, z) => { if (x === 99 || !${JSON.stringify(before)}) { ${w} } return Math.hypot(x, y, z - R) - R })
sprite("ball", { w: 24, h: 24 }, (c) => { ${before} }, surface(sdf.field(d, [-R, -R, 0], [R, R, 2 * R]), { ppm: 3 }))`;
  const O = "({}).constructor";
  for (const [w, before] of [["T[1][0] = x"], ["T.push(1)"], ["T.q = 1"], [`${O}.setPrototypeOf(T, null)`], [`${O}.defineProperty(T, 0, { get: () => 1, enumerable: true, configurable: true })`], ["T[0] = 5", "d(99, 0, 0)"]]) {
    const was = files.length, p = loadSource(src(w, before), `w${Math.random()}.px.js`);
    assert.throws(() => p.build("ball"), /changed its data's 'T/, w);
    assert.equal(files.length, was, w);
  }
});

test("a field of a plain closure is never kept; a broken entry is marched again", () => {
  const plain = ball("d.px.js", art().replace("pure({ R, SALT }, (x, y, z) => Math.hypot(x, y, z - R) - R)", "(x, y, z) => Math.hypot(x, y, z - R) - R"));
  assert.equal(plain.asked, 0);
  files.length = 0;
  const one = ball("e.px.js", art({ R: 2.5 }));
  assert.deepEqual([one.marched, files.length], [1, 1]);
  truncateSync(files[0], 20);
  const again = ball("e.px.js", art({ R: 2.5 }));
  assert.deepEqual([again.marched, again.read], [1, 0]);
  assert.equal(again.out, one.out);
  assert.equal(ball("e.px.js", art({ R: 2.5 })).read, 1);
});
