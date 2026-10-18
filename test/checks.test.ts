import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSource } from "../src/node/load.ts";
import { main } from "../src/node/cli.ts";
import { frontWords, lightWords, litDir } from "../src/core/checks.ts";
import { PAL } from "./helpers.ts";

const run = async (src: string, ...args: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, src);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  let code: number;
  try { code = await main([args[0], file, ...args.slice(1)]); } finally { console.log = log; }
  return { text: lines.join("\n"), code, dir, file };
};

// a head with a nose to the right, lit from the top right: k outline, d body, 6 its lit edges, 1 the
// shaded ones
const HEAD = `sprite("head", { w: 11, h: 9, facing: "right", outline: "k", sockets: { front: [11, 4] } },
  rect(0, 0, 9, 9, "d"), rect(9, 2, 2, 4, "d"), relight(undefined, { light: [0.6, -1], reach: 2, ramps: ["1d6"] }))`;

test("front marker: on the half the label faces; off the drawing or on the back half is called out", () => {
  const p = loadSource(PAL + HEAD + `
sprite("head_wrong", { base: "head", facing: "left" })
sprite("head_off", { base: "head", sockets: { front: [0, -3] } })
sprite("blade", { w: 12, h: 12, outline: "k" }, line(0, 11, 11, 0, "d", 2), relight(undefined, { light: [0.6, -1], ramps: ["1d6"] }))`, "t.px.js");
  assert.equal(frontWords(p.image("head")), "front marker agrees");
  // the label says left, but the marker (the nose) is on the right half: the drawing faces right
  assert.match(frontWords(p.image("head_wrong")), /WARNING: its front marker is on its back half: the drawing faces right, its label says left/);
  assert.match(frontWords(p.image("head_off")), /WARNING: its front marker \(\d+,-?\d+\) is off the drawing/);
  // a thin diagonal's top edges are its left ones: left and top can't be told apart, so x is left unsaid
  assert.equal(litDir(p.image("blade"))?.[0] ?? 0, 0);
});

test("light: the lit side read from the edges; a flipped copy is lit from the other side", () => {
  const p = loadSource(PAL + HEAD + `
sprite("head_l", { base: "head", flip: "x" })`, "t.px.js");
  const d = litDir(p.image("head"))!;
  assert.ok(d[0] > 0 && d[1] < 0, `lit from the top right, got ${d}`);
  assert.equal(lightWords(p.image("head"), [0.6, -1]), "lit from the top right, as its light");
  assert.match(lightWords(p.image("head_l"), [0.6, -1]), /^WARNING: lit from the top left, but its light comes from the top right/);
});

test("describe: feet above where a thing stands, and off the ground", async () => {
  const { text } = await run(PAL + `sprite("man", { w: 3, h: 12, height: 1.8, pivot: [1.5, 12] }, rect(0, 0, 3, 9, "r"))
scene("s", { w: 30, h: 30, bg: "g", world: { scale: 5, ground: 26 } }, layer("props", stamp("man", 10, 26), stamp("man", 20, 24)))`, "describe", "s", "--no-out");
  // the sprite's last 3 rows are empty: its pivot is 3 px under its sole, so it floats
  assert.match(text, /man #1[^]*?WARNING: its feet are 3 px above where it stands \(its pivot is 3 px below its sole\): it floats/);
  assert.match(text, /man #2[^]*?WARNING: its feet \(y 21\) are 5 px above the ground \(y 26\)/);
});

test("rig turn: the mirrored rig takes its own part when drawn, else the original's flipped; the retouch mirrors too", async () => {
  const src = PAL + `rig("man", { w: 8, h: 4, facing: "right", guide: false, turn: "man_l", light: [0.6, -1], slots: {
  body: { at: [2, 0], size: [3, 4], pivot: [0, 0] }, nose: { at: [5, 1], size: [1, 1], pivot: [0, 0] } } }, px(0, 0, "w"))
sprite("man_body", { w: 3, h: 4 }, rect(0, 0, 3, 4, "r"))
sprite("man_nose", { w: 1, h: 1 }, px(0, 0, "k"))
sprite("man_l_nose", { w: 1, h: 1 }, px(0, 0, "g"))`;
  const p = loadSource(src, "t.px.js"), rev = p.assets.get("man")!.pal.reverse();
  const row = (n: string, y: number) => { const im = p.image(n); return [...Array(im.w).keys()].map((x) => rev.get(im.data[y * im.w + x]) ?? ".").join(""); };
  assert.equal(row("man", 0), "w.rrr...");
  assert.equal(row("man", 1), "..rrrk..");
  // turned: body mirrored to x 3-5, its own nose (g) at x 2, the retouch's corner pixel at x 7
  assert.equal(row("man_l", 0), "...rrr.w");
  assert.equal(row("man_l", 1), "..grrr..");
  assert.equal(p.image("man_turnaround").w, 20);
  const { text } = await run(src, "describe", "man_l", "--no-out");
  assert.match(text, /RIG \(facing left, turned from 'man'/);
  assert.match(text, /body: [^\n]*drawn 'man_body' flipped \(no 'man_l_body' of its own\)/);
  assert.match(text, /nose: [^\n]*drawn 'man_l_nose'/);
});

test("pxl blind: shuffled unnamed images and a key; --check compares a reader's answers", async () => {
  const src = PAL + HEAD + `
sprite("head_l", { base: "head", flip: "x" })`;
  const { text, dir, file } = await run(src, "blind", "head", "head_l");
  assert.match(text, /2 images in .*_blind/);
  const key = JSON.parse((await import("node:fs")).readFileSync(join(dir, "out", "_blind", "key.json"), "utf8")) as { n: number; name: string; facing: string }[];
  assert.deepEqual(key.map((k) => k.facing).sort(), ["left", "right"]);
  const answers = Object.fromEntries(key.map((k) => [String(k.n), k.name === "head" ? "right" : "right"]));
  writeFileSync(join(dir, "answers.json"), JSON.stringify(answers));
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["blind", file, "--check", join(dir, "answers.json")]), 1); } finally { console.log = log; }
  assert.match(lines.join("\n"), /head_l: labelled left, the reader says right: look at it\n1 of 2 labels agree/);
});
