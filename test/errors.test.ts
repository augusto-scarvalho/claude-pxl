import { test } from "node:test";
import assert from "node:assert/strict";
import { failure, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";

const has = (msg: string, ...parts: string[]) => {
  for (const p of parts) assert.ok(msg.includes(p), `expected "${p}" in:\n${msg}`);
};

test("unknown color key: location, path, case hint, available keys", () => {
  const e = failure(PAL + 'sprite("a", { w: 2, h: 2 },\n  rect(0, 0, 2, 2, "R"))', "a");
  assert.equal(e.loc, "t.px.js:2:3");
  has(e.message, "sprite 'a' > rect", "unknown color key 'R'", "did you mean 'r'");
});

test("grid errors point at row and column", () => {
  has(failure(PAL + 'sprite("a", "rr\\nrz")', "a").message, "unknown color key 'z'", "row 1, col 1");
});

test("op argument checks at definition time, with usage", () => {
  const e = failure(PAL + 'sprite("a", { w: 1, h: 1 },\n  rect(0, 0, 1, "r"))');
  assert.equal(e.loc, "t.px.js:2:3");
  has(e.message, "rect: argument 4 (h) must be a number", "usage: rect(x, y, w, h, c)");
  has(failure(PAL + 'sprite("a", { w: 1, h: 1 }, px(0, 0))').message, "px: missing argument 3 (c)");
});

test("a top-level helper named as a global (post, text) is named when the load fails", () => {
  // the helper is called where pxl's post() was meant: it returns nothing, the scene gets undefined
  const e = failure(PAL + 'const post = (x, z) => { const h = z + 1 }, W = 4\nscene("s", { w: W, h: 4 },\n  rect(0, 0, 1, 1, "r"),\n  post({ blur: 1 }))');
  assert.equal(e.loc, "t.px.js:2:1");
  has(e.message, "item 2 is undefined", "declares 'post', hiding pxl's post()", "rename the file's");
  // declared after the failing line (not yet initialized) still counts; a file hiding nothing says nothing
  has(failure(PAL + 'sprite("a", { w: 1, h: 1 }, rect(0, 0, 1, "r"))\nfunction text() {}\nconst frame = 1').message, "'frame', 'text'");
  assert.ok(!failure(PAL + 'sprite("a", { w: 1, h: 1 }, rect(0, 0, 1, "r"))').message.includes("hiding"));
});

test("a top-level name hiding a global is a warning when the file loads, at its line", () => {
  const p = loadSource(PAL + 'sprite("a", "r")\nconst W = 2, pose = (t) => t\nfunction figure() {}\n{ const cast = 1 }', "t.px.js");
  assert.deepEqual(p.warnings.map((w) => [w.loc, /^globals: .*declares '(\w+)', hiding pxl's \1\(\)/.exec(w.msg)?.[1]]), [["t.px.js:3", "figure"], ["t.px.js:2", "pose"]]);
  assert.deepEqual(loadSource(PAL + 'sprite("a", "r")', "t.px.js").warnings, []);
});

test("unknown options get suggestions", () => {
  has(failure(PAL + 'sprite("a", { outlin: "k" }, "r")').message, "unknown option 'outlin'", "did you mean 'outline'");
  has(failure(PAL + 'sprite("a", "r", layer("l", { hiden: true }))').message, "unknown option 'hiden'", "did you mean 'hidden'");
});

test("unknown assets get suggestions; cycles and groups-as-base are caught", () => {
  has(failure(PAL + 'sprite("slime", "r"); sprite("a", { w: 1, h: 1 }, stamp("slme", 0, 0))', "a").message, "unknown asset 'slme'", "did you mean 'slime'");
  has(failure(PAL + 'sprite("a", { base: "b" }); sprite("b", { base: "a" })', "a").message, "reference cycle");
  has(failure(PAL + 'sprite("_a", "r"); group("g", ["_a"]); sprite("a", { base: "g" })', "a").message, "is a group/glob");
  has(failure(PAL + 'group("g", ["nope*"]); sprite("a", { w: 1, h: 1 }, stamp("g", 0, 0))', "a").message, "matches no assets");
});

test("definition mistakes: duplicates, bad items, nested layers, missing size", () => {
  has(failure(PAL + 'sprite("a", "r");\nsprite("a", "r")').message, "'a' is already defined at t.px.js:1:");
  has(failure(PAL + 'sprite("a", { w: 1, h: 1 }, [rect(0, 0, 1, 1, "r")])').message, "item 1 is an array");
  has(failure(PAL + 'sprite("a", { w: 1, h: 1 }, layer("x", layer("y")))', "a").message, "can't be nested");
  has(failure(PAL + 'sprite("a", { w: 1 })', "a").message, "no size");
});

test("runtime errors inside functions point at the art file line", () => {
  const e = failure(PAL + 'sprite("a", { w: 1, h: 1 }, (c) => {\n  c.px(0, 0, "nope")\n})', "a");
  assert.equal(e.loc, "t.px.js:2:5");
  has(e.message, "sprite 'a' > function", "unknown color key 'nope'");
});

test("syntax errors report the line", () => {
  const e = failure(PAL + 'sprite("a", "r"\nsprite("b", "r")');
  assert.ok(e.loc?.startsWith("t.px.js:"), e.message);
});

test("ramps validate their keys", () => {
  has(failure(PAL + 'ramps("krX")').message, "ramps", "unknown key 'X'");
  has(failure(PAL + 'sprite("a", { w: 1, h: 1 }, shade())', "a").message, "no ramps defined");
});
