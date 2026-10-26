import { test } from "node:test";
import assert from "node:assert/strict";
import { failure, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";

// White room 40x8 at cell 1 so values are easy to reason about.
const room = (body: string, lighting = "lighting({ cell: 1 })") =>
  loadSource(PAL + `scene("s", { w: 40, h: 8, bg: "w" }, ${body}, ${lighting})`, "t.px.js");
const red = (p: ReturnType<typeof loadSource>, x: number, y: number) => p.image("s").get(x, y) >>> 24;

test("lighting: lamps light nearby pixels, falling off to black", () => {
  const p = room('lamp(2, 4, { r: 20 })');
  assert.equal(red(p, 2, 4), 255);
  assert.ok(red(p, 10, 4) > red(p, 18, 4));
  assert.equal(red(p, 30, 4), 0);
});

test("lighting: solid layers block light, but their edge catches some", () => {
  const p = room('layer("wall", { solid: true }, rect(10, 0, 6, 8, "w")), lamp(2, 4, { r: 40 })', "lighting({ cell: 1, block: 0.9 })");
  const open = room('lamp(2, 4, { r: 40 })');
  assert.ok(red(p, 20, 4) < red(open, 20, 4) / 2, "light behind the wall is much dimmer");
  assert.ok(red(p, 10, 4) > 100, "edge of the block is lit");
  assert.ok(red(p, 14, 4) < red(p, 10, 4) / 2, "light fades inside the block");
});

test("lighting: brighter light reaches deeper into blocks", () => {
  const wall = 'layer("wall", { solid: true }, rect(6, 0, 30, 8, "w"))';
  const dim = room(`${wall}, lamp(2, 4, { r: 40, power: 0.5 })`), bright = room(`${wall}, lamp(2, 4, { r: 40, power: 2 })`);
  assert.equal(red(dim, 26, 4), 0);
  assert.ok(red(bright, 26, 4) > 0);
});

test("lighting: lamps travel with stamps, flips and mirroring", () => {
  const src = PAL + `
sprite("torch", { mx: true }, "r.", lamp(0, 0, { r: 6 }))
scene("s", { w: 40, h: 4, bg: "w" }, stamp("torch", 30, 0), lighting({ cell: 1 }))`;
  const p = loadSource(src, "t.px.js");
  assert.equal(p.image("torch").lamps!.length, 2, "mirror duplicates the lamp");
  assert.equal(p.image("s").get(30, 0) >>> 24, 255);
  assert.equal(p.image("s").get(33, 0) >>> 24, 255, "mirrored lamp lights the right end");
  assert.equal(p.image("s").get(5, 0) >>> 24, 0);
  assert.equal(p.image("s").lamps, undefined, "lighting consumes lamps");
});

test("lighting: sky lights open columns, walls keep it out, unlit layers are skipped", () => {
  const p = loadSource(PAL + `
scene("s", { w: 8, h: 8, bg: "w" },
  layer("bg", { unlit: true }, rect(0, 0, 2, 8, "r")),
  layer("back", { wall: true }, rect(4, 0, 4, 8, "g")),
  lighting({ cell: 1, sky: 1, skyReach: 2 }))`, "t.px.js");
  const img = p.image("s"), pal = p.assets.get("s")!.pal;
  assert.equal(img.get(0, 7), pal.resolve("r"), "unlit layer untouched");
  assert.equal(img.get(2, 7), pal.resolve("w"), "open column fully sky-lit");
  assert.equal(img.get(7, 4) >>> 8 & 255, 0, "deep behind the wall is dark");
});

test("lighting: emit keys ignore it; options are validated", () => {
  const p = room('rect(0, 0, 4, 4, "r")', 'lighting({ cell: 1, emit: "r" })');
  assert.equal(p.image("s").get(1, 1), p.assets.get("s")!.pal.resolve("r"));
  assert.equal(p.image("s").get(20, 6) >>> 24, 0);
  // and with emitLight they light what is round them, in their color
  const lit = room('rect(0, 0, 4, 4, "r")', 'lighting({ cell: 1, emit: "r", emitLight: 12 })');
  assert.ok(red(lit, 8, 2) > 100 && (lit.image("s").get(8, 2) >>> 16 & 255) === 0, "the red cells light the room red");
  assert.equal(red(lit, 20, 2), 0, "past its reach, dark");
  assert.match(failure(PAL + 'scene("s", { w: 4, h: 4 }, lighting({ emitLight: -1 }))', "s").message, /emitLight is how far/);
  assert.match(failure(PAL + 'lighting({ cel: 2 })').message, /unknown option 'cel'.*did you mean 'cell'/);
  assert.match(failure(PAL + 'lamp(1, 1, { radius: 3 })').message, /unknown option 'radius'/);
  assert.match(failure(PAL + 'sprite("a", { w: 2, h: 2 }, layer("l", lighting()))', "a").message, /lighting\(\) goes directly/);
});
