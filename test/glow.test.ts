import { test } from "node:test";
import assert from "node:assert/strict";
import { failure, keys, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";

// Black 20x5 strip with one red "flame" pixel at (10, 2).
const strip = (glow: string) =>
  loadSource(PAL + `scene("s", { w: 20, h: 5, bg: "k" }, px(10, 2, "r"), ${glow})`, "t.px.js");
const red = (p: ReturnType<typeof loadSource>, x: number, y: number) => p.image("s").get(x, y) >>> 24;

test("glow: a halo in the source color that falls off with distance", () => {
  const p = strip('glow("r", { r: 6, strength: 1 })');
  const pal = p.assets.get("s")!.pal;
  assert.equal(p.image("s").get(10, 2), pal.resolve("r"), "the glowing pixel itself is untouched");
  assert.ok(red(p, 11, 2) > red(p, 13, 2) && red(p, 13, 2) > red(p, 15, 2), "falls off");
  assert.equal(p.image("s").get(17, 2), pal.resolve("k"), "nothing beyond r");
  assert.equal((p.image("s").get(11, 2) >>> 16) & 255, 0, "red source, no green in the halo");
});

test("glow: color tints the halo, bands make crisp rings, transparent pixels stay empty", () => {
  const tinted = strip('glow("r", { r: 4, color: "g", strength: 1 })');
  assert.ok(((tinted.image("s").get(11, 2) >>> 16) & 255) > 0, "green tint");
  const banded = strip('glow("r", { r: 6, bands: 2, strength: 1 })');
  assert.equal(red(banded, 11, 2), red(banded, 12, 2), "same band");
  const p = loadSource(PAL + `sprite("s", { w: 5, h: 1 }, px(0, 0, "r"), px(4, 0, "k"), glow("r", { r: 4 }))`, "t.px.js");
  assert.equal(keys(p, "s").slice(0, 4), "r...", "no halo painted onto transparent pixels");
  assert.notEqual(keys(p, "s")[4], "k", "but opaque neighbours are lit");
});

test("glow: ramp mode steps neighbours lighter and stays in the palette", () => {
  const src = 'use("pico8"); pal({ k: 0, d: 5, m: 6, w: 7, y: 10 }); ramps("kdmw"); ' +
    'scene("s", { w: 9, h: 1, bg: "k" }, px(4, 0, "y"), glow("y", { r: 3, ramp: 3 }))';
  const p = loadSource(src, "t.px.js");
  const row = keys(p, "s");
  assert.match(row, /^[kdmw]{4}y[kdmw]{4}$/, "every pixel is a palette key");
  assert.notEqual(row[3], "k", "next to the source is lit");
  assert.equal(row[0], "k", "beyond the radius is unlit");
});

test("glow: keep leaves what the glowing thing is made of as drawn", () => {
  // a flame (y) on a log (d) next to the ground (d too, but the log has its own key: m)
  const src = (keep: string) => 'use("pico8"); pal({ k: 0, d: 5, m: 6, w: 7, y: 10 }); ramps("kdmw"); ' +
    `scene("s", { w: 7, h: 1, bg: "k" }, rect(0, 0, 7, 1, "d"), px(3, 0, "y"), px(4, 0, "m"), glow("y", { r: 3, ramp: 2${keep} }))`;
  assert.notEqual(keys(loadSource(src(""), "t.px.js"), "s")[4], "m", "without keep the log is lifted");
  const kept = keys(loadSource(src(', keep: "m"'), "t.px.js"), "s");
  assert.equal(kept[4], "m", "kept: the log stays as drawn");
  assert.notEqual(kept[2], "d", "the ground around is still lit");
  assert.match(failure('use("pico8"); scene("s", { w: 2, h: 1 }, glow("8", { keep: "@" }))', "s").message, /glow: unknown color key '@'/);
});

test("glow: only directly in a sprite or scene; options are validated", () => {
  assert.match(failure(PAL + 'scene("s", { w: 4, h: 4 }, layer("a", glow("r")))', "s").message, /directly in a sprite or scene/);
  assert.match(failure(PAL + 'scene("s", { w: 4, h: 4 }, glow("r", { radius: 3 }))', "s").message, /radius/);
  assert.match(failure(PAL + 'scene("s", { w: 4, h: 4 }, glow("r", { r: 0 }))', "s").message, /r must be > 0/);
});

test("glow: where limits which pixels glow", () => {
  const p = loadSource(PAL + `scene("s", { w: 30, h: 1, bg: "k" }, px(2, 0, "r"), px(27, 0, "r"), glow("r", { where: [0, 0, 10, 1], r: 3 }))`, "t.px.js");
  const pal = p.assets.get("s")!.pal;
  assert.notEqual(p.image("s").get(3, 0), pal.resolve("k"), "inside: glows");
  assert.equal(p.image("s").get(26, 0), pal.resolve("k"), "outside: no halo");
});

test("glow: after lighting(), lit pixels still glow by their palette key", () => {
  const src = PAL + `scene("s", { w: 20, h: 1, bg: "k" }, px(10, 0, "r"), lamp(10, 0, { r: 4, color: "#888" }),
    lighting({ cell: 1 }), glow("r", { r: 4, strength: 1 }))`;
  const p = loadSource(src, "t.px.js");
  assert.ok(red(p, 12, 0) > 0, "halo around the dimmed red pixel");
  assert.ok(red(p, 10, 0) < 255, "the lit source keeps its lit color");
});
