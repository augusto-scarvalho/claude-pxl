import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addStamp, checkEdit, editAsset, editPart, editStamp } from "../src/core/edit.ts";
import { main } from "../src/node/cli.ts";
import { edit, inspect, unchanged } from "../src/node/edit.ts";
import { loadProject } from "../src/node/load.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/edit.test.ts");

const ok = (r: { src: string } | string) => { assert.equal(typeof r, "object", String(r)); return (r as { src: string }).src; };
const E = (e: Record<string, unknown>) => checkEdit({ target: "t", ...e });

test("edit's writes: a stamp's number where it is, an option added or toggled, a relation, its asset; an asset's own options; a part's spec", () => {
  const src = `const AT = { rock: [10, 4] }\nscene("s", {}, stamp("rock", ...AT.rock), stamp("rock", 3, 4, { flip: "x" }))\n`, line = src.split("\n")[1];
  const A = `a.px.js:2:${line.indexOf("stamp") + 1}`, B = `a.px.js:2:${line.lastIndexOf("stamp") + 1}`, info = { knobs: [], anim: false, has: (n: string) => n === "bush" };
  const at = (loc: string, e: Record<string, unknown>) => ok(editStamp(src, loc, E(e), info)).split("\n")[1];
  assert.match(ok(editStamp(src, A, E({ op: "move", by: [-2, 1] }), info)), /rock: \[8, 5\]/);                          // the table it reads
  assert.match(at(B, { op: "move", by: [2, 0] }), /stamp\("rock", 5, 4, \{ flip: "x" \}\)/);                          // its own number
  assert.match(at(A, { op: "flip" }), /stamp\("rock", \.\.\.AT\.rock, \{ flip: "x" \}\)/);                               // an option added
  assert.match(at(B, { op: "flip" }), /stamp\("rock", 3, 4, \{\}\)/);                                                    // toggled off
  assert.match(at(B, { op: "recolor", swap: { g: "r" } }), /\{ flip: "x", swap: \{ g: "r" \} \}/);
  assert.match(at(A, { op: "relation", beside: ["b", "left", 2] }), /stamp\("rock", 0, 0, \{ beside: \["b", "left", 2\] \}\)/);   // its x, y now an offset
  assert.match(at(B, { op: "swap", asset: "bush" }), /stamp\("bush", 3, 4/);
  assert.match(editStamp(src, B, E({ op: "swap", asset: "tree" }), info) as string, /no asset 'tree'/);
  assert.match(editStamp(src, B, E({ op: "frame", frame: 2 }), info) as string, /isn't animated/);
  assert.match(editStamp(src, B, E({ op: "set", key: "id", value: "x" }), info) as string, /rename it by hand/);
  // an asset's own options, at its sprite() call
  assert.equal(ok(editAsset(`sprite("rock", "kk")`, "a.px.js:1:1", "rock", E({ op: "recolor", scope: "asset", swap: { k: "r" } }))), `sprite("rock", { swap: { k: "r" } }, "kk")`);
  assert.match(editAsset(`front("rock", T)`, "a.px.js:1:1", "rock", E({ op: "flip", scope: "asset" })) as string, /isn't made by a sprite\(\) or anim\(\)/);
  // a world3d part's spec
  const w = `world3d({ parts: {\n  oak: { make: "tree", at: [1, 2] },\n  rock: { make: "rock", beside: ["oak", "front"] } } })`, part = (n: string, e: Record<string, unknown>, params?: string[]) => editPart(w, "a.px.js", n, E(e), ["tree", "rock", "bush"], params);
  assert.match(ok(part("oak", { op: "move", by: [0.5, 0, 1] })), /oak: \{ make: "tree", at: \[1\.5, 2, 1\] \}/);
  assert.match(ok(part("oak", { op: "set", key: "canopy", value: 2 }, ["canopy"])), /at: \[1, 2\], params: \{ canopy: 2 \} \}/);
  assert.match(part("oak", { op: "set", key: "size", value: 2 }, ["canopy"]) as string, /no parameter 'size' \(it has: canopy\)/);
  assert.match(ok(part("rock", { op: "relation", on: "oak" })), /rock: \{ make: "rock", on: "oak" \}/);
  assert.match(ok(part("oak", { op: "relation", on: "rock" })), /oak: \{ make: "tree", on: "rock" \}/);                // its at was where it stood
  assert.match(ok(part("oak", { op: "as", as: "voxels" })), /as: "voxels" \}/);
  assert.match(ok(part("rock", { op: "swap", asset: "bush" })), /rock: \{ make: "bush"/);
  assert.match(part("oak", { op: "flip" }) as string, /a stamp's/);
  assert.throws(() => checkEdit({ op: "move", target: "t" }), /move's by is \[dx, dy\]/);
  assert.throws(() => checkEdit({ op: "grow", target: "t" }), /no op 'grow'/);
});

test("pxl inspect and pxl edit: things by id with their ops; edits written where the values live, all or none, then what changed", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ k: "#1b1630", g: "#8ccf63", r: "#e2585e" })
sprite("rock", "kk\\nkg")
scene("s", { w: 20, h: 8, bg: "g" }, layer("props", stamp("rock", 2, 2, { id: "a" }), stamp("rock", 10, 2), (c) => c.stamp("rock", 15, 4, { id: "c" })))
`);
  const things = JSON.parse(inspect(file, "s", { json: true })).things as { id: string; ops: string[]; why?: string }[];
  assert.deepEqual(things.map((t) => t.id), ["a", "rock #2", "c"]);
  assert.deepEqual(things[0].ops, ["move", "set", "recolor", "flip", "relation", "swap", "add"]);
  assert.match(things[2].why!, /placed by code \(c\.stamp\(\) in a function, a\.px\.js:3:\d+\)/);
  assert.match(inspect(file, "s", { id: "a" }), /values: asset "rock" \(written\); x 2 \(written, a\.px\.js:3\); y 2[^\n]*\n[^]*recolor \{ swap: \{ key: key \} \(its colors: kg\) \}, scope instance \| asset/);
  const before = readFileSync(file, "utf8");
  const no = edit(file, "s", [{ op: "flip", target: "a" }, { op: "move", target: "c", by: [1, 0] }]);
  assert.equal(no.ok, false);
  assert.equal(readFileSync(file, "utf8"), before, "one refused: nothing written");
  const r = edit(file, "s", [{ op: "flip", target: "a" }, { op: "move", target: "rock #2", by: [1, 0] }]);
  assert.ok(r.ok, r.lines.join("\n"));
  assert.match(readFileSync(file, "utf8"), /stamp\("rock", 2, 2, \{ id: "a", flip: "x" \}\), stamp\("rock", 11, 2\)/);
  assert.match(r.lines.join("\n"), /a: redrawn[^]*rock #2: moved \+1,\+0[^]*check: no warnings/);
  assert.doesNotMatch(r.lines.join("\n"), /region /, "what changed is said by id, not by region");
});

test("pxl inspect --find: things by the words of their id, their asset or the comment above their call or their asset's definition", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ k: "#1b1630", g: "#8ccf63" })
sprite("toro", "kk\\nkg")
// a mossy one
sprite("rock", "kk")
scene("s", { w: 20, h: 8, bg: "g" }, layer("props",
  // the stone lanterns
  // by the gate
  stamp("toro", 2, 2, { id: "toro_e" }), stamp("toro", 8, 2),
  stamp("rock", 14, 2)))   // a boulder
`);
  const ids = (w: string) => inspect(file, "s", { find: w }).split("\n").slice(1).map((l) => l.trim().split(":")[0]);
  assert.deepEqual(ids("lanterns"), ["toro_e", "toro #2"]);
  assert.deepEqual(ids("the boulder rock"), ["rock"]);
  assert.match(inspect(file, "s", { find: "boulder" }), /rock: [^\n]*; "a boulder" \(a\.px\.js:9\)/);
  assert.match(inspect(file, "s", { find: "mossy boulder" }), /rock: [^\n]*; "a boulder" \(a\.px\.js:9\)/);       // its definition's comment too
  assert.match(inspect(file, "s", { find: "the mossy rock" }), /rock: [^\n]*; "a mossy one" \(a\.px\.js:4\)/);
  assert.match(inspect(file, "s", { find: "dragon" }), /nothing matches "dragon"[^]*it has: toro_e, toro #2, rock/);
});

test("pxl inspect --id draws only what the thing reads; pxl edit --dry writes nothing; an edit that changes more than its targets is refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js"), boom = join(dir, "boom.px.js");
  const art = `pal({ k: "#1b1630", g: "#8ccf63", r: "#e2585e" })
sprite("rock", "kkk\\nkgk")
sprite("bush", "rr\\nrr")
const AT = { rock: [3, 4] }
`;
  writeFileSync(file, art + `scene("s", { w: 24, h: 10, bg: "g" }, layer("props", stamp("rock", ...AT.rock, { id: "a" }), stamp("bush", 0, 0, { beside: ["a", "right", 1], id: "b" }), stamp("bush", AT.rock[0] + 12, 2, { id: "c" })))\n`);
  writeFileSync(boom, art + `sprite("boom", { w: 2, h: 2 }, () => { throw new Error("built") })
scene("t", { w: 24, h: 10, bg: "g" }, layer("props", stamp("rock", 3, 4, { id: "a" }), stamp("bush", 0, 0, { beside: ["a", "right", 1], id: "b" }), stamp("boom", 0, 0)))\n`);
  // t's boom fails when built: b's place reads a (its relation), never boom
  const box = (f: string, s: string) => JSON.parse(inspect(f, s, { id: "b", json: true })).box;
  assert.throws(() => inspect(boom, "t"), /built/);
  assert.deepEqual(box(boom, "t"), box(file, "s"));
  const before = readFileSync(file, "utf8");
  const dry = edit(file, "s", { op: "move", target: "b", by: [1, 0] }, { dry: true }), said = dry.lines.join("\n");
  assert.ok(dry.ok, said);
  assert.match(said, /- scene\("s"[^\n]*beside: \["a", "right", 1\][^\n]*\n {2}\+ scene\("s"[^\n]*beside: \["a", "right", 2\][^]*pixels changed by id: b 4[^]*dry: nothing written/);
  assert.equal(readFileSync(file, "utf8"), before);
  // a's x is the table c reads too: c would move, refused; allowed, written (b follows a)
  const no = edit(file, "s", { op: "move", target: "a", by: [1, 0] });
  assert.equal(no.ok, false);
  assert.match(no.lines.join("\n"), /refused: besides a, b \(its targets and what is placed by them\), it changes c 4 px \(--allow "c"/);
  assert.equal(readFileSync(file, "utf8"), before);
  const yes = edit(file, "s", { op: "move", target: "a", by: [1, 0] }, { allow: ["c"] });
  assert.ok(yes.ok, yes.lines.join("\n"));
  assert.match(readFileSync(file, "utf8"), /rock: \[4, 4\]/);
});

test("pxl edit's flip turns a turnaround's sprite to its mirror heading (added to its headings when new); facing us, it mirrors", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ k: "#1b1630", g: "#8ccf63", w: "#f4f4f4" })
ramps("kgw")
const F = sdf.box([0.4, 0.4, 0.4]).at(0, 0, 0.2).union(sdf.sphere(0.1).at(0.1, -0.25, 0.2)), O = { view: "side", ppm: 8, mats: { "": "kgw" }, light: [-1, -0.3, 1] }
turnaround("t", F, { ...O, headings: ["e"] })
turnaround("u", F, { ...O, headings: ["e", "w", "s"] })
scene("s", { w: 40, h: 16, bg: "g" }, layer("props", stamp("t_e", 6, 12), stamp("u_e", 18, 12), stamp("u_s", 30, 12)))
`);
  assert.match(inspect(file, "s", { id: "t_e" }), /flip \{ axis: x \(default: turned to face w, its turnaround's t_w \(added to its headings\), lit as it is\) \| y \}/);
  const r = edit(file, "s", [{ op: "flip", target: "t_e" }, { op: "flip", target: "u_e" }, { op: "flip", target: "u_s" }]), said = r.lines.join("\n");
  assert.ok(r.ok, said);
  assert.match(said, /u_s: flip "x"[^]*u_e: turned to face w: asset "u_w"[^]*t_e: turned to face w: headings \["e", "w"\] \(a\.px\.js:4\), asset "t_w"/);
  const text = readFileSync(file, "utf8");
  assert.match(text, /turnaround\("t", F, \{ \.\.\.O, headings: \["e", "w"\] \}\)\nturnaround\("u", F, \{ \.\.\.O, headings: \["e", "w", "s"\] \}\)/);
  assert.match(text, /stamp\("t_w", 6, 12\), stamp\("u_w", 18, 12\), stamp\("u_s", 30, 12, \{ flip: "x" \}\)/);
});

test("pxl edit's rebuild keeps the builds its edit can't reach: a stamp's call redraws its scene, an asset's options it and what reads it, a table everything", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  const art = `pal({ k: "#1b1630", g: "#8ccf63" })
sprite("rock", "kk\\nkg")
sprite("bush", "gg")
sprite("pile", { w: 4, h: 2 }, stamp("rock", 0, 0), stamp("rock", 2, 0))
const AT = { bush: [9, 2] }
scene("s", { w: 20, h: 8, bg: "g" }, layer("props", stamp("pile", 2, 2), stamp("bush", ...AT.bush)))
`;
  writeFileSync(file, art);
  const p = loadProject(file, { checksOnly: true });
  p.build("s");
  const keep = (from: string, to: string) => { const src = art.replace(from, to), q = loadProject(file, { checksOnly: true }, () => src); return { k: unchanged(p, q, new Map([[file, src]])), q }; };
  const { k, q } = keep(`stamp("pile", 2, 2)`, `stamp("pile", 3, 2, { flip: "x" })`);
  assert.deepEqual(["rock", "bush", "pile", "s"].map(k), [true, true, true, false]);
  q.adopt(p, k);
  assert.equal(q.image("pile"), p.image("pile"), "its build taken, not drawn again");
  assert.deepEqual(["rock", "bush", "pile", "s"].map(keep(`sprite("rock", "kk`, `sprite("rock", { flip: "x" }, "kk`).k), [false, true, false, false]);
  assert.deepEqual(["rock", "bush", "pile", "s"].map(keep("bush: [9, 2]", "bush: [10, 2]").k), [false, false, false, false]);
});

test("pxl edit after a relation: a move writes x, y into a call its relation alone places; add writes a new stamp after the one it relates to", () => {
  const src = `scene("s", {}, layer("props",\n  stamp("crates", 5, 9, { id: "crates" }),\n  stamp("cat", { id: "cat", on: "crates" })))\n`, cat = `a.px.js:3:3`, crates = `a.px.js:2:3`, info = { knobs: [], anim: false, has: () => true };
  assert.match(ok(editStamp(src, cat, E({ op: "move", by: [0, 2] }), info)), /stamp\("cat", 0, 2, \{ id: "cat", on: "crates" \}\)/);
  assert.match(ok(addStamp(src, crates, E({ op: "add", target: "cat_2", asset: "cat", beside: ["crates", "left", 2] }))), /\{ id: "crates" \}\),\n {2}stamp\("cat", \{ beside: \["crates", "left", 2\], id: "cat_2" \}\),\n {2}stamp\("cat", \{ id/);
  // like: its asset and options, its x, y when placed the same way; the file's line ends kept
  const lk = { src: `stamp("lamp", -3, 0, { beside: ["post", "above", -14], id: "l1", swap: { y: "r" } })`, loc: "b.px.js:1:1" };
  const crlf = src.replace(/\n/g, "\r\n"), add = (o: Record<string, unknown>) => ok(addStamp(crlf, crates, E({ op: "add", target: "l2", like: "l1", ...o }), lk));
  assert.match(add({ beside: ["crates", "above", -9] }), /\r\n {2}stamp\("lamp", -3, 0, \{ beside: \["crates", "above", -9\], id: "l2", swap: \{ y: "r" \} \}\),\r\n/);
  assert.match(add({ on: "crates" }), /stamp\("lamp", \{ on: "crates", id: "l2", swap/);
  // a comment ending the line it relates to stays on that line
  const said = (s: string) => ok(addStamp(s, crates, E({ op: "add", target: "c2", asset: "cat", on: "crates" })));
  assert.match(said(src.replace(`"crates" }),`, `"crates" }),  // the pile`)), /\{ id: "crates" \}\), {2}\/\/ the pile\n {2}stamp\("cat", \{ on: "crates", id: "c2" \}\),\n {2}stamp\("cat", \{ id/);
  assert.match(said(`scene("s", {}, layer("props",\n  stamp("crates", 5, 9, { id: "crates" }))),  // the pile\n`), /\{ id: "crates" \}\), {2}\/\/ the pile\n {2}stamp\("cat", \{ on: "crates", id: "c2" \}\)\)\),\n$/);
  assert.match(addStamp(`const c = stamp("crates", 5, 9, { id: "crates" })\n`, "a.px.js:1:11", E({ op: "add", asset: "cat", on: "crates" })) as string, /isn't an item of a list/);
  assert.throws(() => E({ op: "add", asset: "cat", on: "ground" }), /add takes its new id/);
  assert.throws(() => E({ op: "add", asset: "cat", like: "c", on: "crates" }), /add takes its new id/);
});

test("pxl edit add, guarded: only the new one changes; inspect names swap's siblings; an edit that changes nothing says so (a flip of its own mirror isn't written); --find's words unquoted", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ k: "#1b1630", g: "#8ccf63", r: "#e2585e" })
sprite("rock", "kk\\nkg")
sprite("man_n", { facing: "back" }, "rkr\\nkkk")
sprite("man_s", { facing: "front" }, "rgr\\nkkk")
scene("s", { w: 24, h: 10, bg: "g" }, layer("props", { sort: "y" },
  stamp("rock", 2, 6, { id: "a", swap: { g: "r" } }),
  stamp("man_n", { beside: ["a", "right", 2], id: "man" })))
`);
  const before = readFileSync(file, "utf8");
  assert.match(inspect(file, "s", { id: "man" }), /flip \{ axis: x \(default: it is its own mirror, a flip changes nothing \(swap turns it\)\)[^]*swap \{ asset: another asset's name \(its siblings: man_s \(facing front\)\) \}[^]*add \{ target: a new id/);
  const flip = edit(file, "s", { op: "flip", target: "man" });
  assert.equal(flip.ok, false);
  assert.match(flip.lines.join("\n"), /it changes nothing: man_n is its own mirror across x[^]*swap it for another view: man_s \(facing front\)[^]*nothing written/);
  assert.match(edit(file, "s", { op: "set", target: "a", key: "seed", value: 3 }, { dry: true }).lines.join("\n"), /changes nothing in the drawing at frame 0/);
  assert.match(edit(file, "s", { op: "set", target: "a", key: "z", value: 1 }).lines.join("\n"), /refused: it changes nothing: z orders a layer sorted by z, and its layer, props, sorts by y/);
  assert.equal(edit(file, "s", { op: "add", target: "man", asset: "rock", on: "a" }).lines[0], "edit: man: add refused: 'man' names one already: an add's target is the new one's id");
  const r = edit(file, "s", [{ op: "add", target: "b", like: "a", beside: ["a", "right", 9] }, { op: "move", target: "man", by: [0, -1] }]);
  assert.ok(r.ok, r.lines.join("\n"));
  assert.match(r.lines.join("\n"), /added b: x 13-14[^]*pixels changed by id: [^\n]*b 4/);
  assert.equal(readFileSync(file, "utf8"), before.replace(`swap: { g: "r" } }),`, `swap: { g: "r" } }),\n  stamp("rock", { beside: ["a", "right", 9], id: "b", swap: { g: "r" } }),`).replace(`stamp("man_n", {`, `stamp("man_n", 0, -1, {`));
  // --find cat crates, unquoted
  const log = console.log, out: string[] = [];
  console.log = (s: string) => out.push(s);
  try { await main(["inspect", file, "s", "--find", "rock", "man"]); } finally { console.log = log; }
  assert.match(out.join("\n"), /3 of its 3 things match "rock man"/);
});
