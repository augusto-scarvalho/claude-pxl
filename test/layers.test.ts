import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { art, PAL } from "./helpers.ts";
import { main } from "../src/node/cli.ts";
import { loadSource } from "../src/node/load.ts";

const LIT = '{ light: [1, 0], reach: 1, ramps: ["1d6"] }';

test("plate: each one lit on its own edges, anywhere (in a layer too); one relight lights only the outer edges", () => {
  const src = PAL + `
sprite("plates", { w: 8, h: 1 }, plate(${LIT}, rect(0, 0, 4, 1, "d")), plate(${LIT}, rect(4, 0, 4, 1, "d")))
sprite("in_layer", { w: 8, h: 1 }, layer("a", plate(${LIT}, rect(0, 0, 4, 1, "d")), plate(${LIT}, rect(4, 0, 4, 1, "d"))))
sprite("one", { w: 8, h: 1 }, rect(0, 0, 8, 1, "d"), relight(undefined, ${LIT}))`;
  assert.equal(art(src, "plates"), "1dd61dd6");
  assert.equal(art(src, "in_layer"), "1dd61dd6");
  assert.equal(art(src, "one"), "1dddddd6");
});

test("outline: false keeps a layer's pixels out of the asset's outline, through a flip", () => {
  // a 2x2 body and a 1 px rope off to its right, on a layer of its own
  const body = 'rect(0, 1, 2, 2, "d")', rope = 'hline(3, 0, 3, "6")';
  const src = PAL + `
sprite("tent", { w: 6, h: 3, outline: "k" }, ${body}, layer("rope", { outline: false }, ${rope}))
sprite("tent_l", { w: 6, h: 3, outline: "k", flip: "x" }, ${body}, layer("rope", { outline: false }, ${rope}))
sprite("ringed", { w: 6, h: 3, outline: "k" }, ${body}, layer("rope", ${rope}))`;
  assert.equal(art(src, "tent"), [
    "........",
    ".kk.666.",
    "kddk....",
    "kddk....",
    ".kk.....",
  ].join("\n"));
  assert.equal(art(src, "tent_l"), [
    "........",
    ".666.kk.",
    "....kddk",
    "....kddk",
    ".....kk.",
  ].join("\n"));
  // without it the rope gets the line all round: a 3 px bar
  assert.match(art(src, "ringed").split("\n")[0], /kkk/);
});

test("describe: a blend layer's line says what it covers and what drawn later hides of it", async () => {
  const src = PAL + `
sprite("box", { w: 4, h: 4 }, rect(0, 0, 4, 4, "8"))
scene("s", { w: 20, h: 10, bg: "1" }, layer("things", stamp("box", 2, 2)), layer("haze", { opacity: 0.5 }, rect(0, 0, 12, 10, "7")),
  layer("front", stamp("box", 8, 2)))`;
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, src);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { await main(["describe", file, "s", "--no-out"]); } finally { console.log = log; }
  // 12x10 of haze: 16 px over the first box, 16 hidden by the second, drawn after it, the rest over the painted ground
  assert.match(lines.join("\n"), /^ {2}haze \(opacity 0\.5\): 120 px; over painting \(88\), box \(16\); 16 px of it hidden by what is drawn later: box \(16\)$/m);
});

test("twin: drawn mirrored before it's lit, so the light stays where it is (a flip carries it across)", () => {
  const src = PAL + `
sprite("blob", { w: 6, h: 3, facing: "right", pivot: [1, 3], sockets: { front: [6, 1] }, twin: "blob_l" },
  rect(0, 0, 5, 3, "d"), px(5, 1, "d"), relight(undefined, ${LIT}))
sprite("flipped", { base: "blob", flip: "x" })`;
  // lit from the right: its right edges light (6), its left ones dark (1); the nose points right
  assert.equal(art(src, "blob"), ["1ddd6.", "1dddd6", "1ddd6."].join("\n"));
  // the twin's nose points left, and it is still lit from the right; the flip is lit from the left
  assert.equal(art(src, "blob_l"), [".1ddd6", "1dddd6", ".1ddd6"].join("\n"));
  assert.equal(art(src, "flipped"), [".6ddd1", "6dddd1", ".6ddd1"].join("\n"));
  const p = loadSource(src, "t.px.js"), t = p.image("blob_l");
  assert.deepEqual([t.pivot, t.sockets?.front, t.orient?.f?.[0]], [[5, 3], [0, 1], -1]);
  assert.throws(() => loadSource(PAL + `sprite("sign", { w: 9, h: 7, twin: "sign_l" }, text(0, 0, "AB", "r"))`, "t.px.js").image("sign_l"), /text in a twin would read backwards/);
});
