import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkEdit, editAsset, editPart, editStamp } from "../src/core/edit.ts";
import { edit, inspect } from "../src/node/edit.ts";

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
  assert.deepEqual(things[0].ops, ["move", "set", "recolor", "flip", "relation", "swap"]);
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

test("pxl inspect --find: things by the words of their id, their asset or the comment above their call", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ k: "#1b1630", g: "#8ccf63" })
sprite("toro", "kk\\nkg")
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
  assert.match(inspect(file, "s", { find: "boulder" }), /rock: [^\n]*; "a boulder" \(a\.px\.js:8\)/);
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
