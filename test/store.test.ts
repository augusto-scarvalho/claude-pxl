// The builds kept on disk (src/node/store.ts): one read back is the build made, every field and the warnings it
// gave; a change to anything it read (an include, a PNG, a palette, pxl's sources) builds it again and an unrelated
// file doesn't; a check's build never serves a full one, and both are kept side by side; what the art's own memo
// carries from one build to another (a warning, an option) goes with what's kept after it; what the art writes as it
// draws (a mask) and another build reads, the art's dice and clock, and a file read after it loaded keep nothing from
// there; a broken entry is made again; a frame handed out to workers is kept whatever it took. Each project here keeps
// every build (as if each took long), and its art says each build it makes (console.debug("made"), counted here).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, truncateSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whenChanged } from "./passed.ts";
import { loadProject } from "../src/node/load.ts";
import { encodePng } from "../src/node/png.ts";
import { budget, decode, encode, prune, sourcesOf } from "../src/node/store.ts";
import { startWorkers } from "../src/node/workers.ts";
import { Img } from "../src/core/image.ts";
import type { Project } from "../src/core/project.ts";

const test = whenChanged("test/store.test.ts");

/** A build as data (every field, key order, shared objects, its arrays' bytes): two builds the same are the same text. */
const text = (v: unknown) => { const bufs: ArrayBufferView[] = []; return JSON.stringify(encode(v, bufs)) + bufs.map((b) => Buffer.from(b.buffer).toString("base64")).join(); };
let made = 0;
const debug = console.debug;
console.debug = (...a: unknown[]) => { if (a[0] === "made") made++; else debug(...a); };
/** How many builds the art made while `fn` ran. */
const count = (fn: () => unknown) => { const n = made; fn(); return made - n; };

const dir = mkdtempSync(join(tmpdir(), "pxl-store-")), put = (f: string, s: string | Buffer) => writeFileSync(join(dir, f), s);
put("a.px.js", `include("part.px.js")
use("pal.hex")
ramps("kGg")
sprite("pic", { png: "p.png" })
sprite("far", { base: "pic", pivot: [20, 0] })
anim("leaf", { w: 8, h: 8, frames: 3 }, (c) => { console.debug("made"); c.rect(0, 0, SIZE, SIZE, "g"); c.stamp("pic", c.frame, 1); c.stamp("far", 1, 1); c.shade([0, 0, 8, 2], 1) })
anim("lit", { w: 8, h: 8, frames: 2 }, (c) => { console.debug("made"); c.rect(0, 0, 8, 8, "g") }, lighting({ cell: 1 }))
scene("top", { w: 20, h: 12, bg: "k" }, stamp("leaf", 2, 2, { id: "l" }), stamp("lit", 11, 2))`);
// x and y read what warner draws through a memo of the art's: the first built builds warner (which warns)
put("memo.px.js", `sprite("far", { w: 2, h: 2, pivot: [20, 0] }, (c) => c.rect(0, 0, 2, 2, "#ff0000"))
sprite("warner", { w: 8, h: 8 }, (c) => c.stamp("far", 1, 1))
let memo
sprite("x", { w: 2, h: 2 }, (c) => { memo ??= c.asset("warner").w; c.rect(0, 0, 2, 2, "#00ff00") })
sprite("y", { w: 2, h: 2 }, (c) => { memo ??= c.asset("warner").w; c.rect(0, 0, 2, 2, "#0000ff") })`);
// the same through lit, lit by a lamp (which a check's build skips): y copies lit's pixels from the memo
put("memo2.px.js", `sprite("lit", { w: 8, h: 8 }, rect(0, 0, 8, 8, "#408040"), lamp(2, 2, { r: 6 }), lighting({ cell: 1 }))
let memo
sprite("x", { w: 8, h: 8 }, (c) => { memo ??= c.asset("lit"); c.rect(0, 0, 8, 8, "#000000") })
sprite("y", { w: 8, h: 8 }, (c) => { memo ??= c.asset("lit"); c.img.data.set(memo.data) })`);
// s takes lit into the memo and then stamps y, which draws from it: y is made inside s, after lit was found made
put("memo3.px.js", `sprite("lit", { w: 8, h: 8 }, rect(0, 0, 8, 8, "#408040"), lamp(2, 2, { r: 6 }), lighting({ cell: 1 }))
let memo
sprite("y", { w: 8, h: 8 }, (c) => { memo ??= c.asset("lit"); c.img.data.set(memo.data) })
sprite("s", { w: 8, h: 8 }, (c) => { memo ??= c.asset("lit"); c.stamp("y", 0, 0) })`);
// _hills's code fills a mask of the file's as it draws, dusk's frames draw from it: _hills found made would leave it empty
put("mask.px.js", `const MASK = new Uint8Array(16)
sprite("_hills", { w: 4, h: 4 }, (c) => { for (let i = 0; i < 16; i += 3) { MASK[i] = 1; c.px(i % 4, i >> 2, "#408040") } })
anim("dusk", { w: 4, h: 4, frames: 2 }, stamp("_hills", 0, 0), (c) => { for (let i = 0; i < 16; i++) if (!MASK[i]) c.px(i % 4, i >> 2, c.frame ? "#202040" : "#101030") })`);
const png = (c: number) => { const i = new Img(2, 2); i.data.fill(c); return encodePng(i); };
put("part.px.js", "const SIZE = 6");
put("pal.hex", "1b1630 k\n8ccf63 g\n4c8a44 G\n");
put("p.png", png(0xffffffff));

/** A project keeping every build (`cold`: reading none), and how many builds the disk served it. */
function load(opts: { cold?: boolean; checksOnly?: boolean; file?: string } = {}) {
  const p = loadProject(join(dir, opts.file ?? "a.px.js"), { checksOnly: opts.checksOnly }), d = p.disk!, n = { served: 0 };
  p.disk = { get: (k, o) => { if (opts.cold) return undefined; const r = d.get(k, o); if (r) n.served++; return r; }, put: (k, out, log, _ms, skip) => d.put(k, out, log, Infinity, skip) };
  return { p, n };
}
/**
 * Every asset at every frame, each as text (a build is one entry: the objects shared within it stay shared, an image
 * it shares with another build comes back its own), and the warnings the project took (not p.reads, for pxl edit,
 * which keeps nothing on disk).
 */
const all = (p: Project) => [...p.order.flatMap((a) => { const tl = p.build(a).anim; return [p.build(a), ...(tl ? Array.from({ length: tl.loop / tl.step }, (_, i) => p.build(a, 0, i * tl.step)) : [])]; }), p.warnings].map(text).join("\n");

test("store: a build read back is the build made, and does to the project what making it did", () => {
  const cold = load({ cold: true }), warm = load();
  let was = "", now = "";
  const a = count(() => (was = all(cold.p))), b = count(() => (now = all(warm.p)));
  assert.ok(a >= 5 && cold.p.warnings.length, "the art builds, and warns (a stamp off the canvas)");
  // (lit, made after leaf warned, isn't kept: it might have reached leaf's work through a memo of the art's)
  assert.ok(b < a && warm.n.served > 0, "leaf read back");
  assert.equal(now, was);
});

test("store: an edit to what a build read builds it again; an unrelated file doesn't", () => {
  load({ cold: true }).p.build("leaf", 0, 125);
  put("other.px.js", 'sprite("x", "k")');
  assert.equal(count(() => load().p.build("leaf", 0, 125)), 0, "an unrelated file in its folder: still read back");
  const again = (edit: () => void, undo: () => void) => {
    edit();
    let now = "";
    assert.ok(count(() => (now = all(load().p))) > 0, "built again");
    assert.equal(now, all(load({ cold: true }).p));
    undo();
  };
  again(() => put("part.px.js", "const SIZE = 5"), () => put("part.px.js", "const SIZE = 6"));
  again(() => put("p.png", png(0xff0000ff)), () => put("p.png", png(0xffffffff)));
  again(() => put("pal.hex", "1b1630 k\n8ccf64 g\n4c8a44 G\n"), () => put("pal.hex", "1b1630 k\n8ccf63 g\n4c8a44 G\n"));
});

test("store: a build that may reach an earlier one's work through the art's own memo isn't kept without its warnings", () => {
  const a = load({ cold: true, file: "memo.px.js" });
  a.p.build("x");
  a.p.build("y");
  const b = load({ file: "memo.px.js" }), fresh = load({ cold: true, file: "memo.px.js" });
  b.p.build("y");
  fresh.p.build("y");
  assert.equal(b.p.warnings.length, 1, "y built again (its memo empty here), warner read back with its warning");
  assert.equal(text(b.p.warnings), text(fresh.p.warnings));
});

test("store: an option read through the art's own memo goes with what's kept after it (a check's pixels never serve a shot)", () => {
  const check = load({ cold: true, checksOnly: true, file: "memo2.px.js" }), fresh = load({ cold: true, file: "memo2.px.js" });
  assert.notEqual(text(check.p.build("lit")), text(fresh.p.build("lit")), "a check's lit is drawn without its lamp");
  check.p.build("x");
  check.p.build("y");
  assert.equal(text(load({ file: "memo2.px.js" }).p.build("y")), text(fresh.p.build("y")));
});

test("store: so does the option of a build found made (read back, not built) while the art's code was running", () => {
  load({ cold: true, checksOnly: true, file: "memo3.px.js" }).p.build("lit");
  const check = load({ checksOnly: true, file: "memo3.px.js" }), fresh = load({ cold: true, file: "memo3.px.js" });
  check.p.build("s");
  assert.equal(check.n.served, 1, "lit read back inside s, y made after it");
  assert.equal(text(load({ file: "memo3.px.js" }).p.build("y")), text(fresh.p.build("y")));
});

test("store: what the art writes as it draws and another build reads: cold, warm and off, the same pictures", () => {
  // (_hills kept alone, as a slow build is, the frames made each time, as quick ones are)
  const frames = (cache: boolean) => {
    const p = loadProject(join(dir, "mask.px.js")), d = p.disk!;
    p.disk = cache ? { get: (k, o) => d.get(k, o), put: (k, out, log, _ms, skip) => { if (k === "_hills") d.put(k, out, log, Infinity, skip); } } : undefined;
    return text(p.frames("dusk").map((f) => f.img));
  };
  const cold = frames(true), warm = frames(true), off = frames(false);
  assert.equal(cold, off);
  assert.equal(warm, off, "_hills made again: its mask filled for the frames");
});

test("store: a check's and a full build of the same asset are kept side by side", () => {
  load({ cold: true, checksOnly: true }).p.build("lit");
  load({ cold: true }).p.build("lit");
  assert.equal(count(() => { load({ checksOnly: true }).p.build("lit"); load().p.build("lit"); }), 0);
});

test("store: the art's dice and clock keep nothing from where they're used (a mention doesn't)", () => {
  const at = (src: string) => { put("dice.px.js", src); return loadProject(join(dir, "dice.px.js")); };
  const S = 'sprite("s", { w: 2, h: 2 }, (c) => c.rect(0, 0, 2, 2, "#ffffff"))';
  assert.ok(at(`// Math.random and Date named here, never called\n${S}`).disk, "a comment costs nothing");
  for (const use of ["const { random } = Math; random()", "Date.now()", "new Date()", "Date()", "new Intl.DateTimeFormat('en').format()"])
    assert.equal(at(`${use}\n${S}`).disk, undefined, `${use} as the file loads: nothing on disk`);
  assert.ok(at(`new Date(0); new Intl.DateTimeFormat('en').format(0)\n${S}`).disk, "a date given is no clock");
  for (const use of ["Math.random()", "new Date()"]) {
    put("dice.px.js", `${S}\nsprite("r", { w: 2, h: 2 }, (c) => { console.debug("made"); ${use}; c.rect(0, 0, 2, 2, "#ffffff") })
scene("top", { w: 4, h: 4 }, (c) => console.debug("made"), stamp("r", 0, 0))`);
    const p = load({ file: "dice.px.js" }).p;
    p.build("s");
    p.build("top");
    assert.equal(p.disk, undefined, `${use} in a build: the disk let go`);
    const q = load({ file: "dice.px.js" }).p;
    assert.equal(count(() => q.build("top")), 2, "neither r nor the scene it was in kept");
    assert.equal(count(() => q.build("s")), 0, "what was kept before it still read back");
  }
});

test("store: a file read after the art file loaded (from a build) keeps nothing", () => {
  put("late.hex", "112233 k\n");
  put("late.px.js", `sprite("u", { w: 2, h: 2 }, (c) => { console.debug("made"); use(${JSON.stringify(join(dir, "late.hex"))}); c.rect(0, 0, 2, 2, "#ffffff") })`);
  const p = load({ file: "late.px.js" }).p;
  p.build("u");
  assert.equal(p.disk, undefined);
  assert.equal(count(() => load({ file: "late.px.js" }).p.build("u")), 1);
});

test("store: pxl's sources are in the key: an edit to any file under them changes it", () => {
  const src = mkdtempSync(join(tmpdir(), "pxl-src-"));
  writeFileSync(join(src, "a.ts"), "export const a = 1;");
  const was = sourcesOf(src);
  writeFileSync(join(src, "a.ts"), "export const a = 2;");
  assert.notEqual(sourcesOf(src), was);
});

test("store: a check's build never serves a full one (what reads checksOnly), a build that doesn't read it serves both", () => {
  load({ cold: true, checksOnly: true }).p.build("lit");
  assert.equal(text(load().p.build("lit")), text(load({ cold: true }).p.build("lit")), "lit, whose lighting() reads checksOnly");
  const b = load({ cold: true, checksOnly: true });
  b.p.build("leaf");
  assert.equal(count(() => load().p.build("leaf")), 0, "leaf, which reads no option, read back");
});

test("store: an entry that doesn't read back whole is ignored and made again", () => {
  load({ cold: true }).p.build("leaf", 0, 250);
  truncateSync((loadProject(join(dir, "a.px.js")).disk as unknown as { file: (k: string, needs?: object) => string }).file("leaf#250"), 40);
  let a = "";
  assert.equal(count(() => (a = text(load().p.build("leaf", 0, 250)))), 1);
  assert.equal(a, text(load({ cold: true }).p.build("leaf", 0, 250)));
  assert.equal(count(() => load().p.build("leaf", 0, 250)), 0, "made again, and kept again");
});

test("store: every field comes back as it was, and what can't (a function) isn't kept", () => {
  const i = new Img(3, 2);
  i.data.set([1, 2, 3, 4, 5, 6]);
  Object.assign(i, { norm: new Int8Array(18).fill(-3), emit: new Uint8Array(6).fill(9), pivot: [1.5, 2], sockets: { hand: [0, 1] }, slice: [1, 1, 1, 0], meters: 1.8, grounded: true,
    orient: { f: [1, 0, 0], u: [0, -1, 0], mirrored: false, text: false }, parts: { ids: new Int32Array(6).fill(-1), names: ["arm"] }, boxes: { hit: [[0, 0, 2, 2]] }, info: { phase: "active", damage: NaN }, figure: [0, 0, 3, 2], lamps: [{ x: 1, y: 1, r: 4, color: 7, power: 1, z: 2 }] });
  const nul = Object.assign(Object.create(null), { a: -0, b: Infinity });
  const v = { img: i, layers: [{ name: "x", img: i }], ops: new Set(["rect"]), m: new Map([["k", [1, , 3]]]), u: undefined, nul };
  const bufs: ArrayBufferView[] = [], e = encode(v, bufs), back = decode(JSON.parse(JSON.stringify(e)), bufs.map((b) => b.buffer.slice(0) as ArrayBuffer)) as typeof v;
  assert.deepStrictEqual(back, v);
  assert.equal(text(back), text(v));
  assert.ok(back.img instanceof Img && back.layers[0].img === back.img && Object.is(back.nul.a, -0) && !(1 in (back.m.get("k") as unknown[])));
  assert.deepEqual(Object.keys(back.img), Object.keys(i));
  assert.throws(() => encode({ f: () => 1 }, []), /unstorable/);
  assert.throws(() => encode(Object.freeze({ a: 1 }), []), /unstorable/);
});

test("store: a frame handed out to workers is kept whatever it took (one not found starts them); with none, one under the floor isn't", () => {
  put("jobs.px.js", `anim("tick", { w: 4, h: 4, frames: 4 }, (c) => c.px(c.frame, 0, "#ffffff"))`);
  const file = join(dir, "jobs.px.js"), kept = (n: string) => {
    process.env.PXL_WORKERS = n;
    try {
      const p = loadProject(file), d = p.disk as unknown as { file: (k: string) => string };
      startWorkers(p, file, {}, "build");
      // (its frames after the first, each made in well under a millisecond)
      const on = p.frames("tick").filter((f) => f.t).map((f) => existsSync(d.file(`tick#${f.t}`)));
      p.elsewhere?.end();
      return on;
    } finally { delete process.env.PXL_WORKERS; }
  };
  assert.deepEqual(kept("1"), [false, false, false]);
  assert.deepEqual(kept("2"), [true, true, true]);
});

test("store: past its budget the least used go first, and .pruned names them until they are written again", () => {
  const d = mkdtempSync(join(tmpdir(), "pxl-prune-")), entry = (c: string, t: number) => { writeFileSync(join(d, c.repeat(40)), Buffer.alloc(100)); utimesSync(join(d, c.repeat(40)), t, t); };
  entry("a", 1000); entry("b", 3000); entry("c", 2000);
  prune(250, d);
  assert.deepEqual(readdirSync(d).sort(), [".pruned", "b".repeat(40), "c".repeat(40)]);
  const note = () => readFileSync(join(d, ".pruned"), "utf8").split("\n");
  assert.deepEqual(note(), ["1 100 250", "a".repeat(16)]);
  entry("a", 4000);
  prune(250, d);
  assert.deepEqual(note(), ["1 100 250", "c".repeat(16)], "a written again: no longer named");
  prune(10_000, d, 1);
  assert.deepEqual(readdirSync(d).sort(), [".pruned", "a".repeat(40)], "maxEntries caps flat-dir growth even under byte budget");
  assert.equal(note()[0], "1 100 10000 1", "entry-cap prune records maxEntries in header");
  // headroom trims below limit when triggered, and skips pruning when under both limits
  entry("d", 5000); entry("e", 6000); entry("f", 7000); entry("g", 8000);
  prune(10_000, d, 10, 0.5);
  assert.equal(readdirSync(d).length, 6, "under both limits: headroom does not prune early");
  prune(10_000, d, 4, 0.5);
  assert.equal(readdirSync(d).length, 3, "over maxEntries=4 with headroom=0.5: trims down to 2 entries + .pruned");
  assert.ok(budget() >= 2 ** 29 && budget() <= 2 ** 31);
});

test("store: lazy Sdf.dist() memo on a top-level field does not invalidate the disk cache", () => {
  put("sdfmemo.px.js", `const BALL = sdf.sphere(4)
sprite("a", { w: 10, h: 10 }, (c) => { console.debug("made"); if (BALL.dist([0, 0, 0]) < 0) c.rect(2, 2, 6, 6, "#ffffff") })
sprite("b", { w: 10, h: 10 }, (c) => { console.debug("made"); c.stamp("a", 0, 0); if (BALL.dist([1, 0, 0]) < 0) c.px(5, 5, "#ff0000") })`);
  const cold = load({ cold: true, file: "sdfmemo.px.js" });
  cold.p.build("b");
  assert.equal(cold.p.offWhy, undefined, "Sdf.dist() memo must stay invisible to top-level state digest");
  assert.ok(cold.p.disk, "disk cache stays active after Sdf.dist()");
  const warm = load({ file: "sdfmemo.px.js" });
  assert.equal(count(() => warm.p.build("b")), 0, "both builds read back from disk");
  assert.equal(warm.n.served, 1);
});

test("store: declarative scene builds skip redundant top-level digests when no art JS runs", () => {
  put("decl.px.js", `sprite("dot", { w: 4, h: 4 }, (c) => { console.debug("made"); c.rect(0, 0, 4, 4, "#ff0000") })
sprite("dot_b", { base: "dot", swap: { "#ff0000": "#00ff00" } })
scene("board", { w: 16, h: 8 }, stamp("dot_b", 0, 0), stamp("dot_b", 6, 0))`);
  load({ cold: true, file: "decl.px.js" }).p.build("dot");
  const warm = load({ file: "decl.px.js" });
  let digests = 0;
  const orig = warm.p.state!;
  warm.p.state = () => { digests++; return orig(); };
  warm.p.build("board");
  assert.ok(digests <= 1, `expected at most 1 baseline digest when no art JS ran, got ${digests}`);
  assert.equal(warm.n.served, 1, "dot served from disk");
});

test("store: frame-pure anim snaps sub-frame timestamps to canonical frame start", () => {
  put("snap.px.js", `anim("walk", { w: 4, h: 4 },
  frame({ ms: 80 }, rect(0, 0, 4, 4, "#ff0000")),
  frame({ ms: 180 }, rect(0, 0, 4, 4, "#00ff00")),
  frame({ ms: 100 }, rect(0, 0, 4, 4, "#0000ff")))
anim("walk_b", { base: "walk", swap: { "#00ff00": "#ffff00" } })`);
  const { p } = load({ cold: true, file: "snap.px.js" });
  const a = p.build("walk_b", 0, 80);
  const madeBefore = p.made;
  const b = p.build("walk_b", 0, 100);
  const c = p.build("walk_b", 0, 200);
  assert.equal(p.made, madeBefore, "timestamps inside the same frame (80, 100, 200) share one build");
  assert.strictEqual(a, b);
  assert.strictEqual(a, c);
});
