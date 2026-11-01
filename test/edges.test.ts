// The edges a reduction leaves (vision.ts: outlineFlaws, edgeFlaws, reduceEdges, closeGaps), shrink's { by } on a png
// and on a base, the closeLine op and pxl check --edges.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { closeGaps, edgeFlaws, reduceEdges } from "../src/core/vision.ts";
import { loadSource } from "../src/node/load.ts";
import { main } from "../src/node/cli.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/edges.test.ts");
const K = pack(40, 20, 30), F = pack(200, 120, 60), L = pack(250, 200, 120);
// rows of a sprite: . clear, k the line, f the fill, l a light
const img = (rows: string[]) => {
  const im = new Img(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => im.set(x, y, ch === "k" ? K : ch === "f" ? F : ch === "l" ? L : 0)));
  return im;
};
const at = (xy: [number, number][]) => xy.map(([x, y]) => `${x},${y}`).sort();

test("edgeFlaws: a curve's steps out of order, tips, notches, bridges, a clipped corner, the line's gaps and doubled corner", () => {
  // a shape's left side growing steadily (runs 1 2 3 4 5), then out of order (1 3 1 4 6); its right side straight
  const side = (xs: number[]) => img(xs.map((x) => ".".repeat(x) + "f".repeat(13 - x) + "."));
  assert.deepEqual(edgeFlaws(side([8, 7, 7, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4])).steps, [], "steady");
  assert.ok(edgeFlaws(side([8, 7, 7, 7, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4])).steps.length > 0, "out of order");
  const f = edgeFlaws(img([
    "..........",
    ".ffff.ff..",
    ".fffffff..",
    ".fffffff.f",
    ".fffffff..",
    "........f.",
    "..........",
  ]));
  assert.deepEqual(at(f.tips), ["8,5", "9,3"], "a pixel sticking out alone");
  assert.deepEqual(at(f.notches), ["5,1"], "a dent a pixel wide");
  assert.deepEqual(at(f.bridges), ["7,4"], "touching a body by a corner only");
  const box = edgeFlaws(img([
    "...........",
    "..fffffff..",
    ".ffffffff..",
    ".ffffffff..",
    ".ffffffff..",
    ".ffffffff..",
    "...........",
  ]));
  assert.deepEqual(at(box.corners), ["1,1"], "a box's corner pixel missing");
  // a line along the right and the bottom, broken for a pixel; and doubled where it steps
  const lined = edgeFlaws(img([
    "fffffffk",
    "fffffffk",
    "ffffffff",
    "fffffffk",
    "fffffffk",
    "fffffffk",
    "kkkkkkkk",
  ]), new Set([K]));
  assert.deepEqual(at(lined.gaps), ["7,2"]);
  // (a line down the right side stepping out a pixel, the pixel at the step doubled into an L)
  const step = img(Array.from({ length: 12 }, (_, y) => (y < 6 ? "f".repeat(9) + "k." : "f".repeat(10) + "k")));
  step.set(10, 5, K);
  assert.deepEqual(at(edgeFlaws(step, new Set([K])).doubled), ["9,5"], "an L where the line steps");
});

test("reduceEdges: coverage first, the line kept by its own vote on the edge, its gaps closed; shrink's plain vote loses it", () => {
  // a disc drawn 3 times over (radius 15 px), its line a pixel thin along its lower right
  const big = new Img(36, 36);
  for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
    const d = Math.hypot(x + 0.5 - 18, y + 0.5 - 18);
    if (d < 15) big.set(x, y, d > 14 && x + y > 36 ? K : F);
  }
  const plain = big.shrink(3), edge = reduceEdges(big, 3, { ink: new Set([K]) });
  const lineOf = (im: Img) => im.data.filter((c) => c === K).length, e = edgeFlaws(edge, new Set([K]));
  assert.ok(lineOf(edge) >= 8 && lineOf(plain) * 4 < lineOf(edge), `its line along the lower right: ${lineOf(edge)} px, the plain vote's ${lineOf(plain)}`);
  assert.deepEqual([e.steps, e.tips, e.notches, e.gaps], [[], [], [], []]);
  // a box's corner block half drawn on both sides is kept (a corner, not rounded off)
  const sq = new Img(30, 30);
  for (let y = 1; y < 29; y++) for (let x = 1; x < 29; x++) sq.set(x, y, F);
  const r = reduceEdges(sq, 3);
  assert.deepEqual([r.get(0, 0), r.get(9, 9), edgeFlaws(r).corners], [F, F, []], "two thirds by two thirds: 0.44 drawn, kept");
  // a gap whose run's ends lie beside its second pixel only: that one closed, the first left (it threw)
  assert.doesNotThrow(() => closeGaps(img(["k.fkk.", "fkffff", "kffkkk", "k..kk.", "..fkff", ".f.k.k"]), new Set([K])));
});

test("shrink { by } on a png and a base: its blocks lined up on the base's pivot, the pivot with it; closeLine; bad specs", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-edges-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ k: "#281e28", f: "#c8783c" }); ramps("kf")
sprite("big", { w: 31, h: 31, pivot: [16, 31] }, (c) => { for (let y = 0; y < 31; y++) for (let x = 0; x < 31; x++) if (Math.hypot(x + 0.5 - 16, y + 0.5 - 16) < 14) c.px(x, y, "f") })
sprite("small", { base: "big", shrink: { by: 3 } })
sprite("plain", { base: "big", shrink: 3 })
sprite("lined", { w: 6, h: 6 }, rect(0, 0, 6, 6, "f"), rect(5, 0, 1, 2, "k"), rect(5, 3, 1, 3, "k"), (c) => c.closeLine())
`);
  const p = loadSource(readFileSync(file, "utf8"), file);
  const s = p.image("small");
  assert.deepEqual([s.w, s.h, s.pivot], [10, 10, [5, 10]], "16 % 3 = 1 column and 31 % 3 = 1 row left off: the pivot on a block's corner");
  assert.deepEqual(edgeFlaws(s).steps, []);
  assert.deepEqual([p.image("plain").w, p.image("plain").pivot], [10, [5, 10]]);
  assert.equal(p.image("lined").get(5, 2), pack(0x28, 0x1e, 0x28), "the gap in the line closed");
  const bad = (src: string, re: RegExp) => assert.throws(() => loadSource(`pal({ f: "#c8783c" })\nsprite("big", { w: 6, h: 6 }, rect(0, 0, 6, 6, "f"))\n${src}`, "b.px.js").image("x"), re);
  bad(`sprite("x", { base: "big", shrink: { by: 2, edge: 1 } })`, /not edge/);
  bad(`sprite("x", { base: "big", shrink: { by: 2, cover: 2 } })`, /cover is the share/);
  bad(`sprite("x", { base: "big", shrink: { by: 2, ink: 3 } })`, /ink is the line's keys/);
  bad(`sprite("x", { w: 2, h: 2 }, (c) => c.closeLine(5))`, /closeLine takes the line's keys/);
});

test("pxl check --edges: a LOOK line on any sprite, base or not, naming each kind with where", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-edges-")), file = join(dir, "a.px.js");
  writeFileSync(file, `pal({ f: "#c8783c" })
sprite("a", { w: 8, h: 6 }, rect(1, 1, 6, 4, "f"), px(7, 2, "f"))
sprite("b", { base: "a" })
`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { await main(["check", file, "--edges"]); await main(["check", file]); } finally { console.log = log; }
  const text = lines.join("\n");
  assert.match(text, /a › LOOK: edges: 1 tips \(at 7,2\) \(PXL help "edges"\)/);
  assert.match(text, /b › LOOK: edges: 1 tips \(at 7,2\)/);
  assert.match(text, /ran: edges on 2/);
  assert.equal(text.split("LOOK: edges").length, 3, "without --edges, none");
});
