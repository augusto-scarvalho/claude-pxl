import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSource } from "../src/node/load.ts";
import { main } from "../src/node/cli.ts";
import { orientWords } from "../src/core/describe.ts";
import { figure } from "../src/core/rig.ts";
import { PAL } from "./helpers.ts";

const describeOf = async (src: string, name: string, ...flags: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, src);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["describe", file, name, "--no-out", ...flags]), 0); } finally { console.log = log; }
  return lines.join("\n");
};

test("facing: flips and turns carry it; which side is toward us follows", () => {
  const p = loadSource(PAL + `sprite("k", { facing: "right" }, "rr\\nrr\\nrr")
sprite("k_l", { base: "k", flip: "x" })
sprite("k_down", { base: "k", rot: 90 })
sprite("k_us", { facing: "front" }, "rr")`, "t.px.js");
  const o = (n: string) => orientWords(p.image(n).orient!);
  assert.equal(o("k"), "facing right, upright, its right side toward us, its left away");
  // a mirror faces it the other way, and the side drawn as its right now plays its left
  assert.equal(o("k_l"), "facing left, upright, its left side toward us, its right away, mirrored: what was drawn as its right side now plays its left");
  // a quarter turn clockwise lays it down with its top to the right, face down
  assert.equal(o("k_down"), "facing down, lying, its top to the right, its right side toward us, its left away");
  assert.equal(o("k_us"), "facing us, upright, its right hand on our left");
});

test("lettering: a mirrored stamp of a sign warns that it reads backwards", async () => {
  const text = await describeOf(PAL + `sprite("sign", { w: 13, h: 7 }, rect(0, 0, 13, 7, "w"), text(1, 1, "RIP", "k"))
scene("s", { w: 40, h: 10, bg: "g" }, layer("props", stamp("sign", 2, 1), stamp("sign", 24, 1, { flip: "x" })))`, "s");
  const [first, second] = text.split("sign #2 @props");
  assert.doesNotMatch(first, /WARNING/);
  assert.match(second, /turned: upright, mirrored: [^\n]*WARNING: mirrored lettering reads backwards/);
});

test("world: a figure's real height against the scale where it stands", async () => {
  const text = await describeOf(PAL + `sprite("man", { w: 3, h: 18, height: 1.8, pivot: "bottom" }, rect(0, 0, 3, 18, "r"))
scene("s", { w: 60, h: 60, bg: "g", world: { horizon: 20, eye: 1.6 } },
  layer("props", stamp("man", 10, 52), stamp("man", 40, 36)))`, "s");
  assert.match(text, /WORLD: ground in perspective, horizon at y 20, eye 1.6 m/);
  // feet on row 52: (52 - 20) / 1.6 = 20 px per meter, so 36 px; drawn 18
  assert.match(text, /man #1[^]*?size: 1.8 m tall is 36 px where it stands \(y 52\); drawn 18 px, 50% too small/);
  // feet on row 36: 10 px per meter, so 18 px: right
  assert.match(text, /man #2[^]*?size: 1.8 m tall is 18 px where it stands \(y 36\); drawn 18 px, right/);
});

test("rig: stand-ins where no part is drawn yet, the near side in front, the far side behind", async () => {
  const src = (facing: string) => PAL + `rig("man", { w: 9, h: 6, facing: "${facing}", guide: false, slots: {
  arm_l: { at: [3, 0], size: [3, 6], side: "l" }, torso: { at: [4, 0], size: [3, 6] }, arm_r: { at: [5, 0], size: [3, 6], side: "r" } } })
sprite("man_torso", { w: 3, h: 6 }, rect(0, 0, 3, 6, "w"))`;
  const row = (facing: string) => {
    const p = loadSource(src(facing), "t.px.js"), img = p.image("man"), rev = p.assets.get("man")!.pal.reverse();
    return [...Array(img.w).keys()].map((x) => { const c = img.data[3 * img.w + x]; return rev.get(c) ?? (c ? "#" : "."); }).join("");
  };
  // facing right: its right arm (x 4-6) is near, drawn over the torso (x 3-5); the left arm (x 2-4) behind it
  assert.equal(row("right"), "..#w###..");
  // facing left: its left arm is near and covers the torso's left; the right arm is behind
  assert.equal(row("left"), "..###w#..");
  const text = await describeOf(src("right"), "man");
  assert.match(text, /RIG \(facing right[^\n]*\n {2}arm_l: 3x6 at x 2-4, y 0-5, joint 3,0; its left, far side \(behind it\); not drawn yet: stand-in box \(draw 'man_arm_l' 3x6\)/);
  assert.match(text, /torso: [^\n]*; middle; drawn 'man_torso'\n/);
  assert.match(text, /1 of 3 parts drawn/);
});

test("figure: landmarks of a standing figure by heads tall", () => {
  const F = figure(80, 8);
  // 8 heads of 10 px: chin 10, crotch at 4 heads (40), knees at 6 (60), shoulders 2 heads wide
  assert.deepEqual([F.head, F.chin, F.crotch, F.knees, F.sole, F.shoulderW], [10, 10, 40, 60, 80, 20]);
});

test("rig: a part that faces another way than the rig is called out", async () => {
  const text = await describeOf(PAL + `rig("man", { w: 9, h: 9, facing: "right", guide: false, slots: {
  torso: { at: [4, 3], size: [3, 6] }, head: { at: [4, 3], size: [3, 3], pivot: [1, 3] } } })
sprite("man_torso", { w: 3, h: 6, facing: "right" }, rect(0, 0, 3, 6, "w"))
sprite("man_head", { w: 3, h: 3, facing: "left" }, rect(0, 0, 3, 3, "r"))`, "man");
  assert.match(text, /head: [^\n]*drawn 'man_head'; WARNING: it faces left, the rig faces right/);
  assert.doesNotMatch(text, /torso: [^\n]*WARNING/);
});
