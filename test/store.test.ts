// The builds kept on disk (src/node/store.ts): one read back is the build made, every field and the warnings it
// gave; a change to anything it read (an include, a PNG, a palette, pxl's sources) builds it again and an unrelated
// file doesn't; a check's build never serves a full one, and both are kept side by side; what the art's own memo
// carries from one build to another (a warning, an option) goes with what's kept after it; the art's dice and clock,
// and a file read after it loaded, keep nothing; a broken entry is made again. Each project here keeps every build
// (as if each took long), and its art says each build it makes (console.debug("made"), counted here).
import assert from "node:assert/strict";
import { mkdtempSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whenChanged } from "./passed.ts";
import { loadProject } from "../src/node/load.ts";
import { encodePng } from "../src/node/png.ts";
import { decode, encode, sourcesOf } from "../src/node/store.ts";
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
const png = (c: number) => { const i = new Img(2, 2); i.data.fill(c); return encodePng(i); };
put("part.px.js", "const SIZE = 6");
put("pal.hex", "1b1630 k\n8ccf63 g\n4c8a44 G\n");
put("p.png", png(0xffffffff));

/** A project keeping every build (`cold`: reading none), and how many builds the disk served it. */
function load(opts: { cold?: boolean; checksOnly?: boolean; file?: string } = {}) {
  const p = loadProject(join(dir, opts.file ?? "a.px.js"), { checksOnly: opts.checksOnly }), d = p.disk!, n = { served: 0 };
  p.disk = { get: (k, o) => { if (opts.cold) return undefined; const r = d.get(k, o); if (r) n.served++; return r; }, put: (k, out, log) => d.put(k, out, log, Infinity) };
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
