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

const cli = async (src: string, ...args: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, src);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { await main([args[0], file, ...args.slice(1)]); } finally { console.log = log; }
  return lines.join("\n");
};
const GREENS = `pal({ k: "#14101c", E: "#2a5a2a", G: "#3e8a3a", g: "#6ab04a", P: "#3a1a5a", p: "#4a2a70", S: "#3d3a4c", s: "#5a5770", B: "#8a7a68", C: "#b8a890" })
`;

test("ramps that branch at a key: a light stepping through it is a warning in pxl check", async () => {
  // dark stone S starts both the stone ramp and the paper one: lit, a paper shadow turns stone gray
  const text = await cli(GREENS + `ramps("kSs", "SBC")
scene("s", { w: 4, h: 2, bg: "S" }, layer("glow", { light: true }, rect(0, 0, 4, 2, "k")))`, "check");
  assert.match(text, /WARNING: light stepped 'S' to 's' along the ramp "kSs", but the ramps branch there \(in "SBC" it goes on to 'B'\)/);
});

test("ramps joined end to end aren't a warning; pxl steps names the ramps a shadow went along", async () => {
  // grass "EGgl" and a potion ramp ending in the grass's darkest: shade 2 takes the grass into the potion
  const src = GREENS + `ramps("EGg", "PpE")
scene("s", { w: 8, h: 4 }, rect(0, 0, 8, 4, "G"), layer("shadow", { shade: 2 }, rect(2, 1, 4, 2, "k")))`;
  assert.doesNotMatch(await cli(src, "check"), /WARNING/);
  assert.match(await cli(src, "steps", "s", "--at", "3,1"), /in shade layer 'shadow' .* -> p {2}\(G→E along "EGg", E→p along "PpE"\)/);
});

test("a scene animated by what it places: its functions get c.frame, c.frames, c.phase over that loop", () => {
  const p = loadSource(PAL + `
anim("blink", { w: 1, h: 1, frames: 4, fps: 4 }, (c) => c.px(0, 0, c.frame % 2 ? "r" : "w"))
scene("s", { w: 8, h: 3, bg: "k" }, stamp("blink", 0, 0), (c) => c.px(2 + c.frame, 1, "g"),
  layer("l", (c) => c.px(c.frames, 2, c.phase === 0.5 ? "r" : "w")))`, "t.px.js");
  const rows = p.frames("s").map((f) => [1, 2].map((y) => [...Array(8).keys()].map((x) => f.img.data[y * 8 + x] === p.assets.get("s")!.pal.resolve("k") ? "." : "#").join("")));
  // the function's mark walks one pixel a frame; the layer's sits at x = frames (4), lit at phase 0.5
  assert.deepEqual(rows.map((r) => r[0]), ["..#.....", "...#....", "....#...", ".....#.."]);
  assert.deepEqual(rows.map((r) => r[1]), ["....#...", "....#...", "....#...", "....#..."]);
  const red = p.assets.get("s")!.pal.resolve("r");
  assert.deepEqual(p.frames("s").map((f) => f.img.data[2 * 8 + 4] === red), [false, false, true, false]);
});

test("cast from each column's foot: a base that isn't level lies where it stands", () => {
  // a hem rising from the front (x 0, y 3) to the back (x 3, y 0): every pixel is on the ground
  const src = PAL + `
sprite("hem", { w: 4, h: 4, pivot: [2, 4] }, px(0, 3, "r"), px(1, 2, "r"), px(2, 1, "r"), px(3, 0, "r"))
scene("by_column", { w: 12, h: 8, bg: "k" }, stamp("hem", 6, 6, { cast: [-1, 0], castBase: "column", silhouette: "w" }))
scene("by_pivot", { w: 12, h: 8, bg: "k" }, stamp("hem", 6, 6, { cast: [-1, 0], silhouette: "w" }))`;
  // by column: each pixel has height 0, the shadow is the hem itself; by the pivot's row the back of
  // the hem is "up" 1 to 3 rows, lands 1 to 3 px to the left, and the four pixels fall on one
  assert.equal(art(src, "by_column").split("\n").slice(2, 6).join("\n"), ["kkkkkkkwkkkk", "kkkkkkwkkkkk", "kkkkkwkkkkkk", "kkkkwkkkkkkk"].join("\n"));
  assert.deepEqual(art(src, "by_pivot").split("\n").slice(2, 6), ["kkkkkkkkkkkk", "kkkkkkkkkkkk", "kkkkkkkkkkkk", "kkkkwkkkkkkk"]);
});

test("register: each frame moved so its marker (the pelvis) lands on one x, whatever an arm does", () => {
  // the body drawn 4 px apart in two frames, an arm reaching out in the second: by the marker (in a
  // ref layer, so not in the art) both bodies land on x 4-6; by the bounding box they wouldn't
  const src = PAL + `
anim("walk", { w: 10, h: 3, register: "c" },
  frame(rect(1, 0, 3, 3, "r")), frame(rect(5, 0, 3, 3, "r"), px(9, 1, "r")),
  layer("marks", { ref: true }, frame(px(2, 1, "c")), frame(px(6, 1, "c"))))
sprite("inked", { w: 6, h: 1, register: { key: "c", x: 3 } }, px(1, 0, "r"), px(2, 0, "c"))
sprite("lost", { w: 4, h: 1, register: "c" }, px(1, 0, "r"))`;
  const p = loadSource(src, "t.px.js"), red = p.assets.get("walk")!.pal.resolve("r");
  const row = (img: { w: number; data: Uint32Array }, y: number) => [...Array(img.w).keys()].map((x) => (img.data[y * img.w + x] === red ? "r" : ".")).join("");
  const [f0, f1] = p.frames("walk").map((f) => f.img);
  assert.equal(row(f0, 1), "....rrr...");
  assert.equal(row(f1, 1), "....rrr.r.");
  // a marker drawn in the art is erased once found
  assert.equal(art(src, "inked"), "..r...");
  assert.throws(() => p.image("lost"), /register: frame 0 has no 'c' marker/);
});
