// What a trace's march finds, kept under its field's key (surface.ts's kept, src/node/store.ts), and pure(), which makes a
// field given by a function keyable (src/node/pure.ts): a pure function reads its arguments, Math and its data alone
// (any other name is an error that says what to do); the same field asked from two files, or from one before and after
// an unrelated edit, marches once; a change to its source, its data, the view, the size or a ray's step marches again;
// a field of a plain closure is never kept; a broken entry is marched again; the store off gives the same pixels; the
// normals and the joins' choices kept with the hits paint as made, by the paint functions of the file that reads them;
// what pure paint functions give at the hits is kept beside them, under their keys too, and read back as made; pure()
// asked again with the same source and data gives back the function it made.
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

// every trace kept, as if each took long; what each asked counted (read: its hits, normals and joins' choices read
// back whole; painted: its paint's answers asked and made, back: read back; kept: made and kept), the entries it wrote
// and what the last one held
const real = kept.trace!, n = { asked: 0, marched: 0, read: 0, painted: 0, back: 0, kept: 0 }, files: string[] = [];
let last: { key: string; rays: Float64Array; t: Float64Array; n?: Float64Array; w?: Int32Array } | undefined;
kept.trace = (k, r) => {
  const o = real(k, r);
  if (!o) return o;
  n.asked++;
  if (o.t && o.n && o.w) n.read++; else n.marched++;
  return {
    ...o, put: (t, _ms, nn, w) => { o.put(t, 1e6, nn, w); files.push(join(DIR, sha1(traceKey(k, r)!))); last = { key: k, rays: r, t, n: nn, w }; },
    paint: (looks) => { const P = o.paint!(looks); if (P.v) n.back++; else n.painted++; return { ...P, put: (v, names, base) => { n.kept++; P.put(v, names, base, 1e6); } }; },
  };
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
  return { out, marched: n.marched - was.marched, read: n.read - was.read, asked: n.asked - was.asked, painted: n.painted - was.painted, back: n.back - was.back, kept: n.kept - was.kept };
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
  // sdf.fbm there, a number of its arguments alone, as outside; what it throws the scope's own
  loadSource(`const d = pure({}, (x) => sdf.fbm(x, 1.5, 2, 7, 2) + sdf.fbm(x, 0, 1))\nsprite("s", { w: 2, h: 2 }, (c) => { if (d(0.3) !== sdf.fbm(0.3, 1.5, 2, 7, 2) + sdf.fbm(0.3, 0, 1)) throw new Error("fbm") })`).build("s");
  assert.throws(() => loadSource(`const d = pure({}, () => { try { return sdf.fbm(1n, 0, 0) } catch (e) { return typeof e.constructor.constructor('return process')() } })\nsprite("s", { w: 2, h: 2 }, (c) => { d() })`).build("s"), /Code generation from strings/);
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

// a pure ball and a box joined (a join whose material is tracked), each its material, painted by a closure of the file
const joined = (paint: string, more = "") => `pal({ k: "#101010", a: "#404040", b: "#808080", c: "#c0c0c0", d: "#e0e0e0" })
ramps("kabcd")
const R = 3, SALT = ${salt}
const d = pure({ R, SALT }, (x, y, z) => Math.hypot(x, y, z - R) - R)
const f = sdf.union(sdf.field(d, [-R, -R, 0], [R, R, 2 * R]).mat("a").part("ball"), sdf.box([4, 4, 2]).at(0, 0, 5.5).mat("b").part("cap"), { smooth: 0.5 })
sprite("ball", { w: 24, h: 24 }, surface(f.paint(${paint}), { ppm: 3, mats: { a: "kab", b: "abc", c: "bcd" } }))
${more}`;
const cold = (name: string, src: string) => { process.env.PXL_CACHE = "0"; try { return ball(name, src).out; } finally { delete process.env.PXL_CACHE; } };

test("a trace's normals and its joins' choices read back paint as made; an edit to a paint function paints with the new one", () => {
  const P1 = "(p, n) => (n[0] > 0.4 ? \"c\" : undefined)", P2 = "(p, n) => (p[2] > 4.5 && n[1] < 0 ? \"c\" : undefined)";
  const a = ball("j.px.js", joined(P1));
  assert.deepEqual([a.marched, a.read], [1, 0]);
  // (kept with the hits: three numbers a hit, and a choice for each join at each hit)
  const H = [...last!.t].filter((t) => !(t < 0)).length;
  assert.ok(H > 50 && last!.n!.length === 3 * H && last!.w!.length > 0 && last!.w!.length % H === 0);
  const b = ball("j.px.js", joined(P1, "// an edit"));
  assert.deepEqual([b.marched, b.read], [0, 1]);
  assert.equal(b.out, a.out);
  assert.equal(cold("j.px.js", joined(P1)), a.out);
  // the paint changed, the field not: its trace read back, painted by the new function as a first build paints it
  const c = ball("j.px.js", joined(P2));
  assert.deepEqual([c.marched, c.read], [0, 1]);
  assert.notEqual(c.out, a.out);
  assert.equal(c.out, cold("j.px.js", joined(P2)));
});

test("an entry whose normals don't fit its hits is made again, not trusted", () => {
  const src = joined("(p, n) => (n[2] > 0.5 ? \"c\" : undefined)", "// short");
  const a = ball("k.px.js", src), was = last!;
  real(was.key, was.rays)!.put(was.t, 1e6, was.n!.slice(3), was.w);
  const before = files.length, b = ball("k.px.js", src);
  assert.equal(files.length, before + 1, "made and kept again");
  assert.equal(b.out, a.out);
  assert.equal(ball("k.px.js", src).read, 1);
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

// (its paint a pure function of its data: what it gives at each hit kept beside the trace, under the function's key)
const P1 = "pure({ L: 0.4 }, (p, n) => (n[0] > L ? \"c\" : undefined))";
test("what a pure paint function gives is read back as made; an edit to it or its data paints again over the hits read back", () => {
  const a = ball("p.px.js", joined(P1));
  assert.deepEqual([a.asked, a.painted, a.kept, a.back], [1, 1, 1, 0]);
  const b = ball("p.px.js", joined(P1, "// an edit"));
  assert.deepEqual([b.read, b.back, b.kept], [1, 1, 0]);
  assert.equal(b.out, a.out);
  assert.equal(cold("p.px.js", joined(P1)), a.out);
  for (const P of [P1.replace("L ?", "L + 0.3 ?"), P1.replace("L: 0.4", "L: 0.1")]) {
    const c = ball("p.px.js", joined(P));
    assert.deepEqual([c.read, c.back, c.painted], [1, 0, 1], P);
    assert.notEqual(c.out, a.out, P);
    assert.equal(c.out, cold("p.px.js", joined(P)), P);
  }
});

test("the light, the palette, an option: the paint read back, the rest made as a first build makes it; another draw read back whole", () => {
  const two = (src: string) => src + `
sprite("cap", { w: 24, h: 24 }, surface(sdf.field(d, [-R, -R, 0], [R, R, 2 * R]).paint(pure({}, (p) => (p[2] > 4 ? "c" : "a"))), { ppm: 2, mats: { a: "kab", c: "bcd" } }))`;
  const a = ball("q.px.js", two(joined(P1)));
  for (const edit of [(s: string) => s.replace("{ ppm: 3, mats", "{ ppm: 3, light: [1, 0, 1], mats"), (s: string) => s.replace('c: "#c0c0c0"', 'c: "#c8c0b0"'), (s: string) => s.replace("{ ppm: 3, mats", "{ ppm: 3, rim: false, mats")]) {
    const src = two(edit(joined(P1))), b = ball("q.px.js", src);
    assert.deepEqual([b.marched, b.back, b.painted], [0, 1, 0], edit.toString());
    assert.notEqual(b.out, a.out, edit.toString());
    assert.equal(b.out, cold("q.px.js", src), edit.toString());
  }
  // (both sprites built, then the first's paint function edited: only it paints again, the other read back)
  const both = (src: string) => { writeFileSync(join(dir, "q.px.js"), src); const q = loadProject(join(dir, "q.px.js")), was = { ...n }; q.disk = undefined; q.build("cap"); q.build("ball"); return [n.back - was.back, n.painted - was.painted]; };
  both(two(joined(P1)));
  assert.deepEqual(both(two(joined(P1.replace("0.4", "0.5")))), [1, 1]);
});

test("a paint function that isn't pure keeps nothing; one that changes its data is an error at its trace; an error read back is the one made", () => {
  const plain = ball("r.px.js", joined("(p, n) => (n[0] > 0.4 ? \"c\" : undefined)"));
  assert.deepEqual([plain.marched + plain.read, plain.painted, plain.back], [1, 0, 0]);
  const was = n.kept, w = loadSource(joined("pure({ T: [1] }, (p, n) => { T[0] = p[0]; return undefined })"), `w${Math.random()}.px.js`);
  assert.throws(() => w.build("ball"), /changed its data's 'T'/);
  assert.equal(n.kept, was);
  // (its answers kept, then the material it names taken out of mats: the same error, at the same place, read back)
  const G = P1.replace('"c"', '"glow"');
  ball("s.px.js", joined(G).replace('c: "bcd"', 'glow: "bcd"'));
  const src = joined(G).replace(', c: "bcd"', ""), err = (f: () => unknown) => { try { f(); } catch (e) { return (e as Error).message; } return "none"; };
  const back = n.back, e1 = err(() => ball("s.px.js", src));
  assert.equal(n.back, back + 1);
  assert.match(e1, /material 'glow' is not in mats/);
  assert.equal(err(() => cold("s.px.js", src)), e1);
});

// (pure() asked again with the same source and data gives back the function it made: the very functions and fields in its
// data, its arrays as they were put there; else, or with a field in it that isn't pure, a new one)
test("pure() gives back the function it made for the same source and data, not for other data nor a field that isn't pure; one whose array was written is refused at its trace", () => {
  loadSource(`const id = pure({}, (v) => v), mk = (L, T) => pure({ L, T }, (x) => T(x) + L[0])
const a = mk([0.4, 1], id), b = mk([0.4, 1], pure({}, (v) => v)), c = mk([0.4, 2], id), e = mk([0.4, 1], pure({ k: 9 }, (v) => v))
const g = sdf.sphere(1), on = (f) => pure({ f }, (p) => f.dist(p)), h = sdf.field((x, y, z) => Math.hypot(x, y, z) - 1, [-1, -1, -1], [1, 1, 1])
const ok = [a === b, a !== c, a !== e, a(1) === 1.4, c(1) === 1.4, on(g) === on(g), on(g) !== on(sdf.sphere(1)), on(h) !== on(h), on(h)([0, 0, 2]) === 1]
sprite("s", { w: 2, h: 2 }, (c) => { if (ok.some((v) => !v)) throw new Error(\`shared wrong: \${ok}\`) })`).build("s");
  // (a paint function that hands out its array, written there: not given back again; the one written, at its trace, refused)
  const W = "pure({ T: [0.4], SALT: " + salt + " }, (p, n) => (p === \"T\" ? T : n[0] > T[0] ? \"c\" : undefined))";
  const broke = `(() => { const w1 = ${W}, w2 = ${W}; if (w1 !== w2) throw new Error("not given back"); w1("T")[0] = 0.9; if (${W} === w1) throw new Error("given back written"); return w2 })()`;
  assert.throws(() => ball("x.px.js", joined(broke)), /changed its data's 'T'/);
  assert.equal(ball("y.px.js", joined(W)).out, cold("y.px.js", joined(W)));
});
