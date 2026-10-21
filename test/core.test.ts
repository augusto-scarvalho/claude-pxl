import { test } from "node:test";
import assert from "node:assert/strict";
import { art, failure, keys, PAL } from "./helpers.ts";
import { perspective } from "../src/core/perspective.ts";
import { bayer, fbm, latticeHash, seamless, vnoise } from "../src/core/util.ts";
import { loadSource } from "../src/node/load.ts";
import { compareSilhouettes, packSheet, sheetJson } from "../src/core/render.ts";
import { pack } from "../src/core/color.ts";
import { readJoints, readMotion, sideColor } from "../src/core/pose.ts";
import { chain } from "../src/core/chain.ts";
import { rotate } from "../src/core/rotate.ts";
import { ik } from "../src/core/rig.ts";
import { Img } from "../src/core/image.ts";

const eq = (a: string, b: string) => assert.equal(a, b);

test("grid: trimmed rows, short rows padded", () => {
  eq(art(PAL + 'sprite("a", `\n    rr\n    r\n`)', "a"), "rr\nr.");
});

test("mirror even, odd and vertical", () => {
  eq(art(PAL + 'sprite("a", { mx: true }, "rw")', "a"), "rwwr");
  eq(art(PAL + 'sprite("a", { mx: "c", my: "c" }, "r.\\n.w")', "a"), "r.r\n.w.\nr.r");
});

test("outline grows the canvas; outline8 adds diagonals", () => {
  eq(art(PAL + 'sprite("a", { outline: "k" }, "r")', "a"), ".k.\nkrk\n.k.");
  eq(art(PAL + 'sprite("a", { outline8: "k" }, "r")', "a"), "kkk\nkrk\nkkk");
});

test("variants: swap, flip, rot", () => {
  const base = PAL + 'sprite("a", "rw\\nr.");';
  eq(art(base + 'sprite("b", { base: "a", swap: { r: "g" } })', "b"), "gw\ng.");
  eq(art(base + 'sprite("b", { base: "a", flip: "x" })', "b"), "wr\n.r");
  eq(art(base + 'sprite("b", { base: "a", rot: 90 })', "b"), "rr\n.w");
});

test("overlay keeps with '.', erases with '_'", () => {
  eq(art(PAL + 'sprite("a", "rrr"); sprite("b", { base: "a" }, "._w")', "b"), "r.w");
});

test("stamps resolve lazily and use the host palette for swaps", () => {
  eq(art(PAL + 'sprite("b", { w: 3, h: 1 }, stamp("_p", 1, 0)); sprite("_p", "w")', "b"), ".w.");
  eq(art(PAL + 'sprite("_p", "r"); sprite("b", { w: 2, h: 1 }, stamp("_p", 0, 0, { swap: { r: "g" } }), px(1, 0, "r"))', "b"), "gr");
});

test("primitives", () => {
  eq(art(PAL + 'sprite("a", { w: 4, h: 3 }, box(0, 0, 4, 3, "r"))', "a"), "rrrr\nr..r\nrrrr");
  eq(art(PAL + 'sprite("a", { w: 4, h: 4 }, line(0, 0, 3, 3, "r"))', "a"), "r...\n.r..\n..r.\n...r");
  eq(art(PAL + 'sprite("a", { w: 5, h: 3 }, line(1, 1, 3, 1, "r", 3))', "a"), "rrrrr\nrrrrr\nrrrrr");
  eq(art(PAL + 'sprite("a", { w: 5, h: 5 }, circ(2, 2, 2, "r"))', "a"), ".rrr.\nrrrrr\nrrrrr\nrrrrr\n.rrr.");
  eq(art(PAL + 'sprite("a", { w: 5, h: 5 }, ring(2, 2, 2, "r"))', "a"), ".rrr.\nr...r\nr...r\nr...r\n.rrr.");
  eq(art(PAL + 'sprite("a", { w: 4, h: 2 }, dither(0, 0, 4, 2, "r", "w"))', "a"), "wrwr\nrwrw");
  eq(art(PAL + 'sprite("a", "r.r\\nrrr", fill(1, 0, "w"))', "a"), "rwr\nrrr");
  eq(art(PAL + 'sprite("a", { w: 4, h: 4 }, poly([0, 0, 4, 0, 0, 4], "r"))', "a"), "rrr.\nrr..\nr...\n....");
});

test("clip restricts any op to a region (half shapes)", () => {
  eq(art(PAL + 'sprite("a", { w: 5, h: 3 }, clip([0, 0, 5, 2], circ(2, 2, 2, "r")))', "a"), ".rrr.\nrrrrr\n.....");
  eq(art(PAL + 'sprite("_p", "ww"); sprite("a", { w: 2, h: 1 }, clip([0, 0, 1, 1], stamp("_p", 0, 0)))', "a"), "w.");
});

test("function items get the canvas", () => {
  eq(art(PAL + 'sprite("a", { w: 3, h: 1 }, (c) => { for (let x = 0; x < 3; x += 2) c.px(x, 0, "r") })', "a"), "r.r");
});

test("tile, pattern and tilemap", () => {
  const base = PAL + 'sprite("_a", "r"); sprite("_b", "w");';
  eq(art(base + 'sprite("t", { w: 3, h: 1 }, tile("_a", 0, 0, 3, 1))', "t"), "rrr");
  eq(art(base + 'sprite("_ab", "rw"); sprite("t", { w: 3, h: 1 }, pattern("_ab", 0, 0, 3, 1))', "t"), "rwr");
  eq(art(base + 'sprite("t", { w: 3, h: 2 }, tilemap("ab\\n.a", { map: { a: "_a", b: "_b" } }))', "t"), "rw.\n.r.");
});

test("groups and globs: stable random picks, weighting", () => {
  const base = PAL + 'sprite("_a", "r"); sprite("_b", "w"); group("g", ["_a", "_b"]);';
  const a = art(base + 'sprite("t", { w: 40, h: 1 }, tile("g", 0, 0, 40, 1))', "t");
  assert.equal(a, art(base + 'sprite("t", { w: 40, h: 1 }, tile("g", 0, 0, 40, 1))', "t"));
  assert.ok(a.includes("r") && a.includes("w"), a);
  const g = art(base + 'sprite("t", { w: 40, h: 1 }, tile("_*", 0, 0, 40, 1))', "t");
  assert.ok(g.includes("r") && g.includes("w"), g);
  eq(art(base + 'group("only", ["_a", "_a"]); sprite("t", { w: 5, h: 1 }, tile("only", 0, 0, 5, 1))', "t"), "rrrrr");
});

test("scatter: count, on-mask, clip, below", () => {
  const a = art(PAL + 'sprite("_d", "w"); sprite("t", { w: 10, h: 10 }, rect(0, 0, 5, 10, "r"), scatter("_d", 0, 0, 10, 10, 12, { on: "r", seed: 3 }))', "t");
  assert.ok((a.match(/w/g) ?? []).length > 4);
  for (const row of a.split("\n")) eq(row.slice(5), ".....");
  eq(art(PAL + 'sprite("_d", "www\\nwww\\nwww"); sprite("t", { w: 6, h: 3 }, rect(0, 0, 3, 3, "r"), scatter("_d", 2, 1, 1, 1, 1, { on: "r", clip: true }))', "t"),
    "rww...\nrww...\nrww...");
  // below: a layer's brush can see the composite under it
  eq(art(PAL + 'sprite("_d", "w"); sprite("t", { w: 4, h: 1 }, rect(0, 0, 2, 1, "r"), layer("x", scatter("_d", 0, 0, 4, 1, 20, { on: "r", below: true })))', "t"), "ww..");
  // even: one pick per grid cell, so every quarter of the area gets exactly one
  const ev = art(PAL + 'sprite("_d", "w"); sprite("t", { w: 8, h: 8 }, scatter("_d", 0, 0, 8, 8, 4, { even: true, seed: 5 }))', "t").split("\n");
  for (const [x0, y0] of [[0, 0], [4, 0], [0, 4], [4, 4]])
    eq(String(ev.slice(y0, y0 + 4).map((row) => row.slice(x0, x0 + 4)).join("").split("w").length - 1), "1");
  // noise's "on" reads its own layer too: matching nothing there is an error, not a silent no-op
  assert.match(failure(PAL + 'sprite("t", { w: 4, h: 1 }, rect(0, 0, 4, 1, "r"), layer("x", noise(0, 0, 4, 1, "w", 1, 1, "r")))', "t").message, /'on: r' matched nothing/);
  // ...and without below, an "on" that finds nothing fails loudly instead of painting nothing
  assert.match(failure(PAL + 'sprite("_d", "w"); sprite("t", { w: 4, h: 1 }, rect(0, 0, 2, 1, "r"), layer("x", scatter("_d", 0, 0, 4, 1, 20, { on: "r" })))', "t").message, /0 of 20 placed.*add below: true/);
});

test("pivot: placements line it up, transforms carry it, sheets export it", () => {
  // "bottom" of the final 3x2 image is [1.5, 2]: stamped at (3, 3), it stands on row 3, centered on x 3.
  eq(art(PAL + 'sprite("t", { w: 3, h: 2, pivot: "bottom" }, rect(0, 0, 3, 2, "r")); scene("s", { w: 7, h: 4 }, stamp("t", 3, 3))', "s"),
    ".......\n..rrr..\n..rrr..\n.......");
  // [x, y] is in drawing coords: the outline shifts it by 1.
  eq(art(PAL + 'sprite("u", { w: 2, h: 1, pivot: [0, 0], outline: "k" }, rect(0, 0, 2, 1, "r")); scene("s", { w: 6, h: 3 }, stamp("u", 2, 1))', "s"),
    "..kk..\n.krrk.\n..kk..");
  // A placement flip mirrors the pivot too.
  eq(art(PAL + 'sprite("v", { pivot: [0, 0] }, "rw"); scene("s", { w: 4, h: 1 }, stamp("v", 3, 0, { flip: "x" }))', "s"), ".wr.");
  const img = loadSource(PAL + 'sprite("t", { w: 4, h: 2, pivot: "bottom" }, rect(0, 0, 4, 2, "r"))').image("t");
  const json = JSON.parse(sheetJson("a.png", img, packSheet([{ name: "t", img }]).frames));
  assert.deepEqual(json.frames.t.pivot, { x: 0.5, y: 1 });
  assert.match(failure(PAL + 'sprite("t", { pivot: "feet" }, "r")', "t").message, /pivot must be "bottom", "center" or \[x, y\]/);
});

test("inline and selout: lines on the sprite's own edge, lines that take the color they touch", () => {
  const R = 'use("pico8"); pal({ k: 0, D: 2, d: 8, w: 7 }); ramps("kDd"); ';
  eq(art(R + 'sprite("t", { w: 3, h: 3, inline: "k" }, rect(0, 0, 3, 3, "d"))', "t"), "kkk\nkdk\nkkk");
  eq(art(R + 'sprite("t", { w: 3, h: 3, inline: "k", selout: 1 }, rect(0, 0, 3, 3, "d"))', "t"), "DDD\nDdD\nDDD");
  // outline + selout: each outline pixel is the sprite color it touches, a step darker; no ramp -> the line color
  eq(art(R + 'sprite("t", { w: 2, h: 1, outline: "k", selout: 1 }, "dw")', "t"), ".Dk.\nDdwk\n.Dk.");
  assert.match(failure(R + 'sprite("t", { selout: true }, "d")', "t").message, /selout recolors a line/);
});

test("shades: keys from one base color, dark to light, hue-shifted, registered as a ramp", () => {
  const p = loadSource('shades("abc", "#5aa040"); sprite("t", "abc"); sprite("s", { base: "t" }, shade())', "t.px.js");
  const [a, b, c] = p.image("t").data, rgb = (v: number) => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255];
  const sum = (v: number) => rgb(v).reduce((x, y) => x + y, 0);
  assert.deepEqual(rgb(b), [0x5a, 0xa0, 0x40], "the base sits exactly at the middle key");
  assert.ok(sum(a) < sum(b) && sum(b) < sum(c), "dark to light");
  const flat = loadSource('shades("abc", "#5aa040", { hue: 0 }); sprite("t", "abc")', "t.px.js").image("t").data[0];
  assert.ok(rgb(a)[2] > rgb(flat)[2], "with hue shifting the dark shade turns toward blue");
  assert.deepEqual([...p.image("s").data], [a, a, b], "the keys form a ramp: shade() steps down it");
  assert.match(failure('shades("a", "#fff")').message, /two or more keys/);
  assert.match(failure('shades("ab", "#fff", { at: 2 })').message, /at must be a key index 0..1/);
  // sat: the light end more saturated than by default, the dark end less
  const chroma = (v: number) => Math.max(...rgb(v)) - Math.min(...rgb(v));
  const [sa, , sc] = loadSource('shades("abc", "#5aa040", { sat: 0.3 }); sprite("t", "abc")', "t.px.js").image("t").data;
  assert.ok(chroma(sc) > chroma(c) && chroma(sa) < chroma(a), `${chroma(sc)} > ${chroma(c)}, ${chroma(sa)} < ${chroma(a)}`);
  assert.match(failure('shades("ab", "#fff", { sat: 2 })').message, /sat is how much more saturated the lights get/);
});

test("curve: through the points, pixel-perfect at 1px, closed loops", () => {
  eq(art(PAL + 'sprite("t", { w: 5, h: 1 }, curve([0, 0, 4, 0], "r"))', "t"), "rrrrr");
  // An arch through 3 points: every point is on it, and no 2x2 block holds an L-corner (3 pixels).
  const arch = art(PAL + 'sprite("t", { w: 13, h: 9 }, curve([0, 8, 6, 0, 12, 8], "r"))', "t").split("\n");
  for (const [x, y] of [[0, 8], [6, 0], [12, 8]]) eq(arch[y][x], "r");
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 12; x++) assert.ok([arch[y][x], arch[y][x + 1], arch[y + 1][x], arch[y + 1][x + 1]].filter((c) => c === "r").length < 3, `L-corner at ${x},${y}\n${arch.join("\n")}`);
  // closed: the loop has no gap, so a fill inside stays inside
  const loop = art(PAL + 'sprite("t", { w: 12, h: 12 }, curve([6, 1, 10, 6, 6, 10, 1, 6], "r", { closed: true }), fill(6, 6, "w"))', "t");
  assert.ok(loop.includes("w") && !loop.split("\n")[0].includes("w") && loop.split("\n")[0].startsWith("."));
  assert.match(failure(PAL + 'sprite("t", { w: 2, h: 2 }, curve([0, 0], "r"))', "t").message, /curve needs \[x0, y0, x1, y1, \.\.\.\]/);
});

test("rotate: quarter turns exact, RotSprite invents no colors, shear keeps every pixel", () => {
  const p = loadSource(PAL + `sprite("s", { mx: true }, \`
    ..rr
    .rwr
    rrrg
    .kkk
    rrk.\`)`, "t.px.js");
  const img = p.image("s"), count = (im: Img) => { const m = new Map<number, number>(); for (const c of im.data) if (c) m.set(c, (m.get(c) ?? 0) + 1); return m; };
  assert.deepEqual([...rotate(img, 90).data], [...img.rot(90).data], "a quarter turn is the exact one");
  assert.deepEqual([...rotate(img, -270).data], [...img.rot(90).data]);
  const colors = new Set(img.data);
  for (const a of [22.5, 30, 45, 135]) for (const c of rotate(img, a, "rotsprite").data) assert.ok(colors.has(c), `new color at ${a} degrees`);
  for (const a of [5, 10, -8, 95]) assert.deepEqual(count(rotate(img, a, "shear")), count(img), `shear at ${a} keeps every pixel`);
  // auto: small angles shear (pixel count kept), larger ones resample
  assert.deepEqual(count(rotate(img, 7)), count(img));
});

test("angle: rotates before the outline; directions() derives the quarter turns and diagonal mirrors exactly", () => {
  const SRC = PAL + `sprite("_b", { mx: true }, "..rr\\n.rwr\\nrrrr\\n.r.r"); `;
  const p = loadSource(SRC + `sprite("t", { base: "_b", angle: 30, outline: "k" })
directions("d", 16, { from: "_b", outline: "k", symmetric: true })
directions("e", 8, { from: "_b", outline: "k", draw: { 45: "_hand" } }); sprite("_hand", { w: 3, h: 3 }, rect(0, 0, 3, 3, "w"))`, "t.px.js");
  // the outline is drawn fresh: every outline pixel touches the sprite on a side, and none is doubled
  const t = p.image("t"), k = p.assets.get("t")!.pal.keys.get("k")!;
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++)
    if (t.get(x, y) === k) assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = t.get(x + dx, y + dy); return c !== k && c !== 0; }), `outline pixel ${x},${y} touches nothing`);
  const d = (i: number) => p.image("d_" + i);
  assert.deepEqual([...d(4).data], [...d(0).rot(90).data], "90 degrees: a quarter turn of 0");
  assert.deepEqual([...d(5).data], [...d(1).rot(90).data], "112.5: a quarter turn of 22.5");
  assert.deepEqual([...d(3).data], [...d(1).flip("x").rot(90).data], "67.5: 22.5 mirrored across the diagonal");
  assert.equal(p.candidates("d").length, 16, "a group of all directions");
  assert.deepEqual([...p.image("e_1").data], [...p.image("_hand").data], "a hand-drawn pose wins");
  assert.deepEqual([...p.image("e_3").data], [...p.image("_hand").rot(90).data], "and its quarter turns follow it");
});

test("layer blend / opacity: color math with what's below; palettize snaps it back", () => {
  const px1 = (src: string) => loadSource(src, "t.px.js").image("t").data;
  const rgb = (v: number) => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  // multiply: 200 * 128 / 255
  assert.deepEqual(rgb(px1('sprite("t", { w: 1, h: 1 }, px(0, 0, "#c86432"), layer("m", { blend: "multiply" }, px(0, 0, "#808080")))')[0]), [100, 50, 25, 255]);
  // opacity: halfway between black and white
  assert.deepEqual(rgb(px1('sprite("t", { w: 1, h: 1 }, px(0, 0, "#000"), layer("o", { opacity: 0.5 }, px(0, 0, "#fff")))')[0]), [128, 128, 128, 255]);
  // over empty pixels: normal keeps the layer at that alpha; multiply has nothing to work on
  const empty = px1('sprite("t", { w: 2, h: 1 }, layer("a", { opacity: 0.5 }, px(0, 0, "#fff")), layer("b", { blend: "multiply" }, px(1, 0, "#fff")))');
  assert.deepEqual([rgb(empty[0])[3], empty[1]], [128, 0]);
  // palettize: the 50% grey snaps to the nearest keyed color
  assert.deepEqual(rgb(px1('pal({ k: "#000", g: "#7a7a7a", w: "#fff" }); sprite("t", { w: 1, h: 1 }, px(0, 0, "k"), layer("o", { opacity: 0.5, palettize: true }, px(0, 0, "w")))')[0]), [0x7a, 0x7a, 0x7a, 255]);
  assert.match(failure(PAL + 'sprite("t", { w: 1, h: 1 }, px(0, 0, "r"), layer("x", { blend: "darken" }, px(0, 0, "w")))', "t").message, /layer blend must be "normal", "multiply"/);
});

test("tilemap iso: a diamond grid drawn back to front", () => {
  const T = ["a", "b", "c", "d"].map((k, i) => `sprite("${k}", { w: 4, h: 2 }, rect(0, 0, 4, 2, "${"rwgk"[i]}")); `).join("");
  eq(art(PAL + T + 'scene("s", { w: 8, h: 4 }, tilemap("ab\\ncd", { iso: true, w: 4, h: 2, x: 2, map: { a: "a", b: "b", c: "c", d: "d" } }))', "s"),
    "..rrrr..\nggggwwww\nggkkkkww\n..kkkk..");
  assert.match(failure(PAL + 'sprite("a", "r"); scene("s", { w: 4, h: 4 }, tilemap("a", { iso: true, map: { a: "a" } }))', "s").message, /needs the floor diamond's size/);
});

test("font: glyphs cut from a sprite, trimmed to their ink (proportional), used by text()", () => {
  // two 3x2 cells: "A" fills its cell, "i" is one column in the middle
  const F = PAL + 'sprite("_f", "rrr.r.\\nr.r.r."); font("tiny", "_f", { chars: "Ai", w: 3, h: 2 }); ';
  eq(art(F + 'sprite("t", { w: 7, h: 2 }, text(0, 0, "AiA", "w", { font: "tiny" }))', "t"), "www.w.w\nw.w.w.w");
  assert.equal(art(F + 'sprite("t", { w: 3, h: 2 }, text(0, 0, "a", "w", { font: "tiny" }))', "t"), "www\nw.w", "lowercase falls back to the capital");
  assert.match(failure(F + 'sprite("t", { w: 4, h: 4 }, text(0, 0, "Z", "w", { font: "tiny" }))', "t").message, /font 'tiny' has no glyph for 'Z'/);
  assert.match(failure(F + 'sprite("t", { w: 4, h: 4 }, text(0, 0, "A", "w", { font: "tinny" }))', "t").message, /unknown font 'tinny'.*tiny/);
  assert.match(failure(PAL + 'font("x", "_f", { chars: "A" })').message, /needs \{ chars: "ABC\.\.\.", w, h \}/);
  // mono: the "i" centered in the "A"'s width, so "AiA" and "AAA" are as wide
  const M = PAL + 'sprite("_f", "rrr.r.\\nr.r.r."); font("tiny", "_f", { chars: "Ai", w: 3, h: 2, mono: true }); ';
  eq(art(M + 'sprite("t", { w: 11, h: 2 }, text(0, 0, "AiA", "w", { font: "tiny" }))', "t"), "www..w..www\nw.w..w..w.w");
});

test("panel: 9-slice, corners stay, edges and center repeat; flips turn the margins; sheets export them", () => {
  // corners k, top/bottom edge g, left/right edge w, center r, 1px margins
  const box = 'sprite("b", { slice: 1 }, "kgk\\nwrw\\nkgk"); ';
  eq(art(PAL + box + 'scene("s", { w: 5, h: 4 }, panel("b", 0, 0, 5, 4))', "s"), "kgggk\nwrrrw\nwrrrw\nkgggk");
  // asymmetric margins follow a flip: the 2px side ends up on the right
  eq(art(PAL + 'sprite("a", { slice: [2, 0, 1, 0] }, "kkrw"); scene("s", { w: 6, h: 1 }, panel("a", 0, 0, 6, 1, { flip: "x" }))', "s"), "wrrrkk");
  const p = loadSource(PAL + box);
  const json = JSON.parse(sheetJson("s.png", p.image("b"), packSheet([{ name: "b", img: p.image("b") }]).frames));
  assert.deepEqual(json.meta.slices[0].keys[0].center, { x: 1, y: 1, w: 1, h: 1 });
  assert.match(failure(PAL + 'sprite("b", "kk"); scene("s", { w: 4, h: 4 }, panel("b", 0, 0, 4, 4))', "s").message, /has no slice margins/);
  assert.match(failure(PAL + 'sprite("b", { slice: 2 }, "kkk\\nkkk\\nkkk")', "b").message, /slice must be n or \[left, top, right, bottom\] leaving a center/);
});

test("sheet extrude: edge pixels repeat outward, frame rects stay put", () => {
  const p = loadSource(PAL + 'sprite("a", "rw"); sprite("b", "wr")');
  const { sheet, frames } = packSheet([{ name: "a", img: p.image("a") }, { name: "b", img: p.image("b") }], 2, 0, 1);
  assert.deepEqual([sheet.w, sheet.h, frames[0].x, frames[0].y, frames[1].x], [8, 3, 1, 1, 5]);
  const r = p.image("a").data[0], w = p.image("a").data[1];
  for (let y = 0; y < 3; y++) assert.deepEqual([...sheet.data.subarray(y * 8, y * 8 + 8)], [r, r, w, w, w, w, r, r]);
});

test("grad r: radial from the center to the ellipse that fits the box; c.size() reads an asset's size", () => {
  eq(art(PAL + 'sprite("t", { w: 5, h: 5 }, grad(0, 0, 5, 5, ["r", "."], "r", 0))', "t"), ".....\n..r..\n.rrr.\n..r..\n....."); // 2 colors meet halfway out
  eq(art(PAL + 'sprite("_d", { w: 3, h: 2 }, rect(0, 0, 3, 2, "r")); sprite("t", { w: 4, h: 1 }, (c) => c.px(c.size("_d").w, 0, "w"))', "t"), "...w");
  assert.match(failure(PAL + 'sprite("t", { w: 2, h: 2 }, grad(0, 0, 2, 2, "rw", "d"))', "t").message, /grad direction must be "v", "h" or "r"/);
});

test("wrap: drawing, stamps, fills and reads continue across the wrapped edges", () => {
  eq(art(PAL + 'sprite("t", { w: 4, h: 1, wrap: "x" }, rect(3, 0, 2, 1, "r"))', "t"), "r..r");
  eq(art(PAL + 'sprite("t", { w: 2, h: 3, wrap: "x" }, rect(0, 2, 1, 2, "r"))', "t"), "..\n..\nr.");     // "x" only: y clips
  eq(art(PAL + 'sprite("_d", "rr\\nrr"); sprite("t", { w: 3, h: 3, wrap: true }, stamp("_d", 2, 2))', "t"), "r.r\n...\nr.r");
  eq(art(PAL + 'sprite("t", { w: 4, h: 1, wrap: "x" }, px(1, 0, "k"), px(2, 0, "k"), fill(3, 0, "r"))', "t"), "rkkr");
  eq(art(PAL + 'sprite("t", { w: 3, h: 1, wrap: "x" }, px(0, 0, "r"), (c) => { if (c.is(3, 0, "r")) c.px(1, 0, "w") })', "t"), "rw.");
});

test("layers: order, offset, hidden, blend, inferred size, outline after", () => {
  eq(art(PAL + 'sprite("a", { w: 4, h: 1 }, rect(0, 0, 4, 1, "w"), layer("l", { x: 1 }, px(0, 0, "r")), px(1, 0, "g"), layer("h", { hidden: true }, px(3, 0, "r")))', "a"), "wgww");
  eq(art(PAL + 'ramps("rw"); sprite("a", { w: 3, h: 1 }, rect(0, 0, 3, 1, "w"), layer("s", { shade: true }, px(2, 0, "k")))', "a"), "wwr");
  eq(art(PAL + 'sprite("a", { outline: "k" }, layer("l", "r"))', "a"), ".k.\nkrk\n.k.");
  eq(art(PAL + 'ramps("rw"); scene("s", { w: 4, h: 1, bg: "w" }, layer("l", { shade: true, density: 0.5 }, rect(0, 0, 4, 1, "k")))', "s"), "rwrw");
});

test("ramps: shade/light step along, regions and density", () => {
  const base = PAL + 'ramps("krw");';
  eq(art(base + 'sprite("a", { w: 5, h: 1 }, rect(0, 0, 5, 1, "w"), shade([2, 0, 1]))', "a"), "wrrrw");
  eq(art(base + 'sprite("a", { w: 3, h: 1 }, rect(0, 0, 3, 1, "w"), shade(undefined, 2))', "a"), "kkk");
  eq(art(base + 'sprite("a", { w: 2, h: 1 }, rect(0, 0, 2, 1, "r"), light())', "a"), "ww");
  eq(art(base + 'sprite("a", { w: 4, h: 2 }, rect(0, 0, 4, 2, "w"), shade(undefined, 1, 0.5))', "a"), "rwrw\nwrwr");
  eq(art(base + 'sprite("a", { w: 2, h: 1 }, rect(0, 0, 2, 1, "w"), recolor({ w: "g" }, [0, 0, 1, 1]))', "a"), "gw");
});

test("wire with hangs, text", () => {
  eq(art(PAL + 'sprite("_b", "w"); sprite("a", { w: 9, h: 4 }, wire(0, 0, 8, 0, 2, "r", { hang: "_b", every: 4, start: 4 }))', "a"),
    "r.......r\n.r.....r.\n..rrrrr..\n....w....");                       // pixel-perfect and symmetric
  eq(art(PAL + 'sprite("a", { w: 3, h: 5 }, text(0, 0, "L", "r"))', "a"), "r..\nr..\nr..\nr..\nrrr");
});

test("reseed rebuilds a placed asset with fresh random choices", () => {
  const src = PAL + 'sprite("_a", "r"); sprite("_b", "w"); group("g", ["_a", "_b"]);' +
    'sprite("cell", { w: 8, h: 1 }, tile("g", 0, 0, 8, 1));' +
    'sprite("t", { w: 8, h: 6 }, tile("cell", 0, 0, 1, 6, { reseed: true }))';
  const rows = art(src, "t").split("\n");
  assert.ok(new Set(rows).size > 1, rows.join("\n"));
});

test("sheets expand globs (exported only) and groups", () => {
  const p = loadSource(PAL + 'sprite("s1", "rr"); sprite("s2", "r"); sprite("_x", "r"); group("g", ["_x"]); sheet("sh", ["s*", "g"], { pad: 1 })');
  assert.deepEqual(p.sheetNames(p.sheets[0]), ["s1", "s2", "_x"]);
});

test("trace records each top-level op, layer and post step", () => {
  const p = loadSource(PAL + 'sprite("a", { w: 3, h: 1, outline: "k" },\n  rect(0, 0, 3, 1, "r"),\n  (c) => { c.px(0, 0, "w"); c.px(2, 0, "w") })', "t.px.js", { trace: true });
  const frames = p.build("a").trace!.frames;
  assert.deepEqual(frames.map((f) => f.label), ['rect(0, 0, 3, 1, "r")', 'px(0, 0, "w")', 'px(2, 0, "w")', "outline k"]);
  assert.equal(frames[0].loc, "t.px.js:2:3");
  assert.equal(frames[1].loc, "t.px.js:3:14");
  assert.equal(frames[3].w, 5); // outline frame shows the grown image
});

test("on masks: '.' means an empty pixel (scatter around a shape, not on it)", () => {
  // a 1px dot scattered only where the canvas is still empty: never over the red block
  const out = art(PAL + 'sprite("_d", "w"); sprite("t", { w: 4, h: 1 }, "rr", scatter("_d", 0, 0, 4, 1, 4, { on: ".", even: true }))', "t");
  assert.match(out, /^rr/);
  assert.ok(out.includes("w"), "placed on the empty pixels");
});

test("runs: [x, chars] runs at absolute x, row by row; '.' keeps, '_' erases", () => {
  eq(art(PAL + 'sprite("t", { w: 5, h: 2 }, rect(0, 0, 5, 2, "w"), runs({ 0: [[1, "rr"]], 1: [[0, "k"], [3, ".__"]] }))', "t"), "wrrww\nkwww.");
  assert.match(failure(PAL + 'sprite("t", { w: 2, h: 1 }, runs({ 0: [[1]] }))', "t").message, /runs: row 0, run 1 must be \[x, "chars"\]/);
  assert.match(failure(PAL + 'sprite("t", { w: 2, h: 1 }, runs({ 0: [[0, "z"]] }))', "t").message, /in runs row 0, run 1/);
});

test("inline keep: edge pixels in the kept keys stay, the rest of the edge becomes the line", () => {
  const R = 'use("pico8"); pal({ k: 0, D: 2, d: 8, w: 7 }); ';
  eq(art(R + 'sprite("t", { w: 3, h: 3, inline: { color: "k", keep: "D" } }, runs({ 0: [[0, "DdD"]], 1: [[0, "ddd"]], 2: [[0, "ddd"]] }))', "t"), "DkD\nkdk\nkkk");
  assert.match(failure(R + 'sprite("t", { inline: { color: "k", keep: "q" } }, "d")', "t").message, /inline keep: unknown color key 'q'/);
  assert.match(failure(R + 'sprite("t", { inline: { colour: "k" } }, "d")', "t").message, /inline must be a color, or \{ color, keep/);
});

test("shrink: most common opaque color per block, ties to the first by columns, transparent under half", () => {
  const a = pack(255, 0, 0), b = pack(0, 0, 255), img = new Img(6, 2);
  // block 1: a a / a b -> a; block 2: b a / a b -> tie, first by columns is b; block 3: one pixel -> empty
  [[0, 0, a], [1, 0, a], [0, 1, a], [1, 1, b], [2, 0, b], [3, 0, a], [2, 1, a], [3, 1, b], [4, 0, a]]
    .forEach(([x, y, c]) => img.set(x, y, c));
  assert.deepEqual([...img.shrink(2).data], [a, b, 0]);
});

test("reference layers: in the guide image only, not in the art; transforms that move the art are refused", () => {
  const src = PAL + 'sprite("t", { w: 3, h: 1 }, "rr", layer("guide", { ref: 0.5 }, ".ww"))';
  const p = loadSource(src);
  eq(art(src, "t"), "rr.");
  const g = p.build("t").guide!;
  assert.equal(g.data[2], p.assets.get("t")!.pal.resolve("w"));
  assert.notEqual(g.data[1], g.data[0]); // over the art: half and half
  assert.match(failure(PAL + 'sprite("t", { mx: true }, "r", layer("g", { ref: true }, "w"))', "t").message, /reference layers stay in drawing coordinates; mx/);
  assert.equal(loadSource(PAL + 'sprite("t", { w: 1, h: 1 }, "r", layer("g", { ref: true }, "w"))').build("t").guide!.data[0], pack(255, 241, 232), "true: full color");
  assert.match(failure(PAL + 'sprite("t", "r", layer("g", { ref: 2 }, "w"))', "t").message, /ref must be true or a strength from 0 to 1/);
});

test("pose: bones and joints from named joints, scaled and moved; OpenPose COCO-18 read by position", () => {
  eq(art(PAL + 'sprite("t", { w: 6, h: 1 }, pose({ a: [0, 0], b: [2, 0, 0.9], c: [9, 9, 0.1] }, { scale: 2, x: 1, bones: [["a", "b"], ["b", "c"]], color: "r", joint: "w", min: 0.5 }))', "t"), ".wrrrw");
  const kp = Array(54).fill(0);
  kp.splice(2 * 3, 3, 10, 20, 1); kp.splice(5 * 3, 3, 30, 20, 1);   // r_shoulder, l_shoulder
  const j = readJoints({ people: [{ pose_keypoints_2d: kp }] });
  assert.deepEqual(j.r_shoulder, [10, 20, 1]);
  assert.deepEqual(j.neck, [20, 20, 1]); // 0,0,0 means missing in OpenPose; the neck comes from the shoulders
  assert.deepEqual(readJoints({ l_shoulder: [30, 20], r_shoulder: [10, 20] }).neck, [20, 20, 1]);
  assert.match(failure(PAL + 'sprite("t", pose({ a: "x" }))', "t").message, /joint 'a' must be \[x, y\]/);
});

test("compareSilhouettes: row extents side by side and how much wider the asset is", () => {
  const solid = (w: number, h: number, rows: [number, number][]) => {
    const im = new Img(w, h);
    rows.forEach(([l, r], y) => { for (let x = l; x <= r; x++) im.set(x, y, pack(1, 2, 3)); });
    return im;
  };
  const out = compareSilhouettes(solid(8, 2, [[1, 6], [2, 5]]), solid(8, 2, [[2, 5], [2, 5]]));
  assert.match(out, /^ {2}0 {2}2-5 +1-6 +\+1 +\+1$/m);
  assert.match(out, /wider on 1 \(up to \+1 left, \+1 right\).*the same on 1/);
});

test("cast: an upright asset laid flat on the ground from its base, carrying its pivot", () => {
  // a 1x3 post standing on its pivot; the shadow lies along the ground, one px further out per px of height
  const P = PAL + 'sprite("post", { pivot: "bottom" }, "r\\nr\\nr"); ';
  eq(art(P + 'scene("s", { w: 4, h: 3 }, stamp("post", 0, 3, { cast: [1, 0], silhouette: "k" }))', "s"), "....\n....\nkkk.");
  // ky stretches it down the screen too, and a row never leaves a gap
  eq(art(P + 'scene("s", { w: 3, h: 6 }, stamp("post", 0, 3, { cast: [0, 1.5], silhouette: "k" }))', "s"), "...\n...\nk..\nk..\nk..\nk..");
  assert.match(failure(P + 'scene("s", { w: 4, h: 3 }, stamp("post", 0, 3, { cast: 0.5 }))', "s").message, /cast must be \[kx, ky\]/);
});

test("relight: edges facing the light step lighter along their ramp, edges facing away darker", () => {
  // default light from the top-left: top +1, left +0.5, bottom -1, right -0.5, rounded
  eq(art(PAL + 'ramps("krw"); sprite("a", { w: 3, h: 3 }, rect(0, 0, 3, 3, "r"), relight())', "a"), "www\nwrr\nrkk");
  // reach: empty space up to 2 px away counts, past other colors too; ramps given inline; colors on no ramp stay
  eq(art(PAL + 'sprite("a", { w: 4, h: 1 }, rect(0, 0, 4, 1, "r"), px(3, 0, "g"), relight(null, { ramps: ["krw"], light: [-1, 0], reach: 2 }))', "a"), "wwkg");
  assert.match(failure(PAL + 'sprite("a", { w: 1, h: 1 }, px(0, 0, "r"), relight())', "a").message, /relight: no ramps/);
});

test("tilemap corners: one char per tile corner, each tile picked by its corner mask", () => {
  const T = PAL + 'sprite("t_13", "r"); sprite("t_4", "w"); sprite("full", "g"); ';
  // corners "#.." over "##.": the left tile has TL+BL+BR set (1+4+8 = 13), the right one BL (4)
  eq(art(T + 'scene("s", { w: 2, h: 1 }, tilemap("#..\\n##.", { corners: "#", size: 1, map: "t_" }))', "s"), "rw");
  eq(art(T + 'scene("s", { w: 1, h: 1 }, tilemap("ww\\nww", { corners: "w", size: 1, map: { 15: "full" } }))', "s"), "g");
  assert.match(failure(T + 'scene("s", { w: 1, h: 1 }, tilemap("#.\\n.#", { corners: true, size: 1, map: "t_" }))', "s").message, /no tile for corner mask 9 \(top-left \+ bottom-right set\)/);
});

test("sockets: a stamp attaches to a socket of an earlier stamp, through flips; errors name what exists", () => {
  // a 3x1 body with a socket at its right end; an arm (1x1, pivot at its corner) hangs from it
  const S = PAL + 'sprite("body", { sockets: { hand: [3, 0] } }, "rrr"); sprite("arm", "w"); ';
  eq(art(S + 'scene("s", { w: 5, h: 1 }, stamp("body", 0, 0), stamp("arm", 0, 0, { at: "body.hand" }))', "s"), "rrrw.");
  // offsets add to the socket; a flipped body carries its socket to the other side
  eq(art(S + 'scene("s", { w: 5, h: 1 }, stamp("body", 2, 0, { flip: "x", id: "b" }), stamp("arm", -1, 0, { at: "b.hand" }))', "s"), ".wrrr");
  assert.match(failure(S + 'scene("s", { w: 5, h: 1 }, stamp("arm", 0, 0, { at: "body.hand" }))', "s").message, /nothing placed as 'body' yet/);
  assert.match(failure(S + 'scene("s", { w: 5, h: 1 }, stamp("body"), stamp("arm", 0, 0, { at: "body.foot" }))', "s").message, /no socket 'foot'; it has: hand/);
});

test("layer sort: stamps draw by z, or by where they stand, ties in call order", () => {
  const S = PAL + 'sprite("a", "rr"); sprite("b", "ww"); ';
  // without sort the later stamp covers; with sort "z" the higher z does
  eq(art(S + 'scene("s", { w: 3, h: 1 }, layer("l", { sort: "z" }, stamp("a", 0, 0, { z: 1 }), stamp("b", 1, 0)))', "s"), "rrw");
  eq(art(S + 'sprite("t", { pivot: "bottom" }, "g\\ng"); scene("s", { w: 3, h: 3 }, layer("l", { sort: "y" }, stamp("t", 1, 3), stamp("a", 0, 2)))', "s"), "...\n.g.\nrg.");   // the post stands lower (y 3), so it covers the bar (y 2)
  assert.match(failure(S + 'scene("s", { w: 3, h: 1 }, layer("l", { sort: "x" }, stamp("a")))', "s").message, /sort must be "y" or "z"/);
});

test("motion: one direction of a motion file, scaled and placed by its floor point, whole pixels", () => {
  const file = { format: "pxl-motion/1", name: "hop", floor: [10, 20], joints: ["mid_hip", "l_ankle"],
    directions: { S: { ms: [100, 100], contact: [[1, 0], [0, 1]], frames: [[[10, 10, 0.5], [8, 20, 0.2]], [[10, 8, 0.5], [12, 18, 0.3]]] } } };
  const m = readMotion(file, { dir: "S", scale: 0.5, at: [4, 9] });
  assert.deepEqual(m.frames[0], { mid_hip: [4, 4], l_ankle: [3, 9] });
  assert.deepEqual(m.frames[1], { mid_hip: [4, 3], l_ankle: [5, 8] });
  assert.deepEqual(m.ms, [100, 100]);
  assert.deepEqual(m.contact, [[1, 0], [0, 1]]);
  assert.equal(m.depth[1].l_ankle, 0.3);
  assert.throws(() => readMotion(file, { dir: "N" }), /no direction 'N'.*it has S/);
  assert.throws(() => readMotion({ joints: [] }), /not a pxl motion file/);
});

test("pose sides: limbs take a color by side, the spine keeps its own", () => {
  assert.equal(sideColor("l_shoulder", "l_elbow"), "#e048d8");
  assert.equal(sideColor("r_knee", "r_ankle"), "#28c0e8");
  assert.equal(sideColor("mid_hip", "l_hip"), "#f09a28");
  assert.equal(sideColor("head", "neck"), undefined);
  // drawn: a left arm in magenta, the spine in the given color
  const j = '{ neck: [1, 0], mid_hip: [1, 2], l_shoulder: [2, 0], l_elbow: [2, 2] }';
  const src = PAL + `pal({ m: "#e048d8" }); sprite("p", { w: 3, h: 3 }, pose(${j}, { sides: true, color: "w", joint: false }))`;
  eq(art(src, "p"), ".wm\n.wm\n.wm");
});

test("warp: pixels move by whole-pixel offsets, taking the color behind them; no holes", () => {
  // rows above the third move down one: the top row empties, the third is covered
  eq(art(PAL + 'sprite("a", { w: 1, h: 4 }, "r\\nw\\ng\\nk", warp((x, y) => (y <= 2 ? [0, 1] : null)))', "a"), ".\nr\nw\nk");
  // a shear: each column down by its x, legs (columns) stay whole
  eq(art(PAL + 'sprite("a", { w: 3, h: 3 }, "rrr\\nw.w", warp((x) => [0, x]))', "a"), "r..\nwr.\n..r");
  // a region limits it, and the offsets are rounded
  eq(art(PAL + 'sprite("a", { w: 3, h: 1 }, "rwg", warp(() => [0.6, 0], [1, 0, 2, 1]))', "a"), "rrw");
  assert.match(failure(PAL + 'sprite("a", { w: 1, h: 1 }, "r", warp(() => 5))', "a").message, /must give \[dx, dy\]/);
});

test("chain: links keep their length, hang along gravity, trail behind travel, and loop", () => {
  const still = chain([[0, 0], [0, 0]], { links: 3, length: 2 });
  for (const f of still) {
    for (let i = 1; i < f.length; i++) assert.ok(Math.abs(Math.hypot(f[i][0] - f[i - 1][0], f[i][1] - f[i - 1][1]) - 2) < 1e-6);
    assert.ok(Math.abs(f[3][0]) < 0.01 && f[3][1] > 5.9, "hangs straight down");
  }
  // walking left: the end trails to the right of the anchor
  const walk = chain([[0, 0], [0, 0], [0, 0], [0, 0]], { links: 3, length: 2, move: [-1, 0] });
  assert.ok(walk.every((f) => f[3][0] > 0.5), "trails right");
  // seamless: one more frame after the last comes back to the first
  const bob = chain([[0, 0], [0, -1], [0, 0], [0, -1]], { links: 3, loops: 40 });
  const again = chain([[0, 0], [0, -1], [0, 0], [0, -1]], { links: 3, loops: 41 });
  assert.ok(Math.abs(bob[0][3][1] - again[0][3][1]) < 0.01, "the loop repeats");
  assert.throws(() => chain([]), /one \[x, y\] per frame/);
  // Celeste-style following: at rest each point sits a step from the one before; moving, it trails
  const rest = chain([[0, 0], [0, 0]], { links: 3, follow: 1.5, step: [0, 1] });
  assert.ok(Math.abs(rest[0][3][1] - 3) < 0.01 && Math.abs(rest[0][3][0]) < 0.01);
  const run = chain([[0, 0], [0, 0]], { links: 3, follow: 1.5, step: [0, 1], max: 3, move: [-2, 0] });
  assert.ok(run[0][3][0] > 1 && run[0].every((p, i) => i === 0 || Math.hypot(p[0] - run[0][i - 1][0], p[1] - run[0][i - 1][1]) <= 3 + 1e-9));
});

test("scatter near: only where `on` is within `within` px of `near`; sorted layers order scattered picks too", () => {
  // a 9x1 strip of grass with dirt at x 0: tufts land only on grass next to the dirt
  const S = PAL + 'sprite("t", "w"); ';
  const out = art(S + 'scene("s", { w: 9, h: 1 }, rect(0, 0, 9, 1, "g"), px(0, 0, "k"), scatter("t", 0, 0, 9, 1, 3, { on: "g", near: "k", within: 1 }))', "s");
  assert.equal(out, "kw" + "g".repeat(7));
  assert.match(failure(S + 'scene("s", { w: 9, h: 1 }, rect(0, 0, 9, 1, "g"), scatter("t", 0, 0, 9, 1, 3, { on: "g", near: "k" }))', "s").message, /within 2 px of 'k' matched nothing/);
  // in a sort: "y" layer a scattered pick standing lower covers a stamp standing higher
  const T = PAL + 'sprite("post", { pivot: "bottom" }, "r\\nr"); sprite("dot", "w"); ';
  eq(art(T + 'scene("s", { w: 1, h: 3, bg: "g" }, layer("l", { sort: "y" }, stamp("post", 0, 3), scatter("dot", 0, 2, 1, 1, 1)))', "s"), "g\nr\nr");
});

test("rampmap: colors dark to light take a ramp's keys in order; hue picks which colors", () => {
  // three grays, light, dark, mid: onto "krw" by brightness, not by nearest color
  eq(art(PAL + 'sprite("a", { w: 3, h: 1 }, px(0, 0, "#cccccc"), px(1, 0, "#202020"), px(2, 0, "#808080"), rampmap("krw"))', "a"), "wkr");
  // two colors onto a 3-key ramp spread to its ends; a green left alone by a red-only hue range
  eq(art(PAL + 'sprite("a", { w: 3, h: 1 }, px(0, 0, "#400000"), px(1, 0, "#ff4040"), px(2, 0, "g"), rampmap("krw", { hue: [340, 20] }))', "a"), "kwg");
  assert.match(failure(PAL + 'sprite("a", { w: 1, h: 1 }, px(0, 0, "r"), rampmap("kq"))', "a").message, /unknown color key 'q'|'q'/);
});

test("arc: a quarter clockwise or the other way round, a filled sector, a smear thickening toward its head", () => {
  const src = PAL + `
sprite("quarter", { w: 7, h: 7 }, arc(3, 3, 3, 0, 90, "r"))
sprite("sector", { w: 7, h: 7 }, arc(3, 3, 3, 0, 90, "r", { inner: 0 }))
sprite("ccw", { w: 7, h: 7 }, arc(3, 3, 3, 0, -90, "r"))
sprite("taper", { w: 13, h: 7 }, arc(6, 6, 6, 180, 360, "r", { inner: 2, taper: true }))`;
  assert.equal(art(src, "quarter"), [".......", ".......", ".......", "......r", "......r", ".....r.", "...rr.."].join("\n"));
  assert.equal(art(src, "sector"), [".......", ".......", ".......", "...rrrr", "...rrrr", "...rrr.", "...rr.."].join("\n"));
  assert.equal(art(src, "ccw"), ["...rr..", ".....r.", "......r", "......r", ".......", ".......", "......."].join("\n"));
  // from pointing left over the top to pointing right: thin where it starts, 4 px where it ends
  assert.deepEqual(art(src, "taper").split("\n").map((r) => [r.indexOf("r"), r.lastIndexOf("r") - r.indexOf("r") + 1]).slice(4), [[0, 13], [9, 4], [9, 4]]);
});

test("ik: two bones reach the point, the joint on the side asked for; out of reach they lie straight", () => {
  const len = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const up = ik(10, 10, [10, 10], 1), down = ik(10, 10, [10, 10], -1), far = ik(10, 10, [30, 0]);
  for (const [j, e] of [up, down]) {
    assert.ok(Math.abs(len([0, 0], j) - 10) < 1e-9 && Math.abs(len(j, e) - 10) < 1e-9 && len(e, [10, 10]) < 1e-9);
  }
  assert.ok(up[0][1] > down[0][1], "bend 1 puts the joint below (y down), -1 above");
  assert.ok(Math.abs(far[0][1]) < 0.5 && far[1][0] > 19.9 && far[1][0] < 20, "out of reach: straight to the pixel, short of it");
  // in an art file: the hand where the bones put it
  assert.equal(art(PAL + `const [elbow, hand] = ik(3, 3, [4, 2])
sprite("arm", { w: 5, h: 3 }, line(0, 0, Math.round(elbow[0]), Math.round(elbow[1]), "r"), px(Math.round(hand[0]), Math.round(hand[1]), "w"))`, "arm").split("\n")[2][4], "w");
});

test("has: an asset or a group defined so far", () => {
  const p = loadSource(PAL + `const before = has("dot")
sprite("dot", "r")
group("dots", ["dot"])
if (!before && has("dot") && has("dots") && !has("nothing")) sprite("ok", "r")`, "t.px.js");
  assert.ok(p.assets.has("ok"));
});

test("perspective: ground points land on rays to the vanishing point; plane draws the ground row by row; fit picks a size", () => {
  // a 90-degree view 100 px wide: focal 50 px; the eye 2 m up, the horizon on row 20
  const p = loadSource(PAL + `const P = perspective({ w: 100, horizon: 20, eye: 2, fov: 90 })
sprite("tall_8", { w: 3, h: 8 }, rect(1, 0, 1, 8, "r"))
sprite("tall_4", { w: 3, h: 4 }, rect(1, 0, 1, 4, "r"))
sprite("tall_2", { w: 3, h: 2 }, rect(1, 0, 1, 2, "r"))
// stripes 2 m wide along the road and a crossing band 10-12 m away
scene("s", { w: 100, h: 60, bg: "k" }, plane(P, (x, z) => (z > 10 && z < 12 ? "w" : Math.floor(x / 2) % 2 ? "g" : ".")),
  (c) => { for (const [i, z] of [5, 10, 20].entries()) { const [x, y] = P.ground(0, z); c.stamp("tall_*", 10 + i * 10, Math.round(y), { fit: P.scale(z) * 1.6 }) } })`, "t.px.js");
  const env = { w: 100, horizon: 20, eye: 2, fov: 90 };
  const P = perspective(env);
  assert.ok(Math.abs(P.focal - 50) < 1e-9);
  assert.deepEqual(P.ground(0, 10), [50, 30]);           // straight ahead: the middle column, 10 rows down
  assert.deepEqual(P.ground(4, 10), [70, 30]);           // 4 m across at 10 m: 20 px to the side
  const near = (a: number[] | null, b: number[]) => assert.ok(a && a.every((v, i) => Math.abs(v - b[i]) < 1e-9), `${a} ~ ${b}`);
  near(P.at(69.5, 29.5), [4, 10]);
  assert.equal(P.at(50, 10), null, "above the horizon");
  // turned 45 degrees: x and z lines meet one focal length either side; a ground point and the
  // pixel it lands on agree both ways
  const T = perspective({ ...env, yaw: 45 });
  near([T.vanish(0), T.vanish(90)], [0, 100]);
  const [cx, cy] = T.ground(3, 7);
  near(T.at(cx - 0.5, cy - 0.5), [3, 7]);
  assert.ok(Math.abs(T.scale(7, 3) - 50 / (3 * Math.SQRT1_2 + 7 * Math.SQRT1_2)) < 1e-9);
  // the crossing band: rows whose depth is 10-12 m (row 30 is 10 m, row 28 about 12.5 m)
  const rows = keys(p, "s").split("\n");
  assert.match(rows[29], /^w+$/);
  assert.notEqual(rows[35][0], "w");
  // fit: 1.6 m is 16 px at 5 m and 8 px at 10 m (both take the 8 px drawing), 4 px at 20 m
  const tops = [10, 20, 30].map((x) => rows.findIndex((r) => r[x + 1] === "r"));
  const heights = [10, 20, 30].map((x) => rows.filter((r) => r[x + 1] === "r").length);
  assert.deepEqual(heights, [8, 8, 4]);
  assert.ok(tops[0] > tops[2], "the near one stands lower on screen");
  assert.throws(() => perspective({ w: 100, horizon: 20, eye: 0 }), /perspective: \{ w, horizon, eye \}/);
});

test("perspective: tilted up, uprights meet at a third point above, the horizon drops, and pixels still find their ground", () => {
  const near = (a: number[] | null, b: number[], eps = 1e-6) => assert.ok(a && a.every((v, i) => Math.abs(v - b[i]) < eps), `${a} ~ ${b}`);
  const env = { w: 100, horizon: 80, eye: 1.5, fov: 90, yaw: 30 };
  assert.equal(perspective(env).vertical(), null, "level: no third point");
  const T = perspective({ ...env, pitch: 30 });
  // the camera looks focal·tan(30°) above the horizon; the ground's far points still sit on it
  near([T.ground(0, 1e7)[1]], [80], 1e-3);
  // a pole 20 m tall: its foot, middle and top on one line through the third point, which is above
  const [vx, vy] = T.vertical()!, pole = [0, 5, 12, 20].map((u) => T.ground(4, 15, u))
  assert.ok(vy < 0, "above the picture");
  for (const [x, y] of pole.slice(1)) assert.ok(Math.abs((x - vx) * (pole[0][1] - vy) - (y - vy) * (pole[0][0] - vx)) < 1e-6, "on the line to the third point");
  assert.ok(Math.abs(pole[3][0] - pole[0][0]) > 1, "and it leans on screen");
  // ground lines still meet on the horizon, now spread wider by 1/cos(pitch)
  near([T.ground(1e7 * Math.sin((30 * Math.PI) / 180), 1e7 * Math.cos((30 * Math.PI) / 180))[0]], [T.vanish(30)], 1e-3);
  // a ground point and the pixel it lands on agree both ways
  const [cx, cy] = T.ground(3, 7);
  near(T.at(cx - 0.5, cy - 0.5), [3, 7]);
  assert.throws(() => perspective({ ...env, pitch: 90 }), /pitch is how far the camera tilts/);
});

test("perspective: a pixel's ray and where a direction lands agree, and give the vanishing points", () => {
  const near = (a: number[] | null, b: number[], eps = 1e-6) => assert.ok(a && a.every((v, i) => Math.abs(v - b[i]) < eps), `${a} ~ ${b}`);
  const T = perspective({ w: 120, horizon: 70, eye: 1.4, fov: 80, yaw: 25, pitch: 15 });
  for (const [col, row] of [[0, 0], [60, 40], [119, 89], [30, 75]]) near(T.toward(T.ray(col, row)), [col + 0.5, row + 0.5]);
  near([Math.hypot(...T.ray(10, 20))], [1]);
  const a = (40 * Math.PI) / 180;
  near([T.toward([Math.sin(a), Math.cos(a), 0])![0]], [T.vanish(40)]);
  near([T.toward([Math.sin(a), Math.cos(a), 0])![1]], [70]);
  near(T.toward([0, 0, 1]), T.vertical()!);
  assert.equal(T.toward([0, -1, -0.1]), null, "behind the eye");
});

test("perspective with a bend: places on the way land bend·z²/2 to the side, at() gives them back, directions don't bend; plane and terrain follow it", () => {
  const near = (a: number[] | null, b: number[], eps = 1e-6) => assert.ok(a && a.every((v, i) => Math.abs(v - b[i]) < eps), `${a} ~ ${b}`);
  const view = { w: 80, horizon: 30, eye: 2, fov: 90 }, S = perspective(view), B = perspective({ ...view, bend: 0.01 });
  near(B.ground(0, 20), S.ground(2, 20), 1e-9);
  near([B.scale(20, 0)], [S.scale(20, 2)]);
  for (const [col, row] of [[10, 40], [60, 33], [40, 49]]) { const g = B.at(col, row)!; near(B.ground(g[0], g[1]), [col + 0.5, row + 0.5]); }
  near(B.toward([0, 1, 0])!, S.toward([0, 1, 0])!);
  assert.match(failure(PAL + `perspective({ ...${JSON.stringify(view)}, bend: "x" })`).message, /bend \(the way's curvature/);
  // a line down the middle of a way that bends right: farther up the picture it runs right of the middle; terrain draws the same
  const line = `(x, z) => (Math.abs(x) < 0.3 ? "r" : "g")`, bent = JSON.stringify({ ...view, bend: 0.01 });
  const p = loadSource(PAL + `scene("p", { w: 80, h: 50, bg: "k" }, plane(${bent}, ${line}))
scene("t", { w: 80, h: 50, bg: "k" }, terrain(${bent}, () => 0, ${line}))
scene("c", { w: 80, h: 50, bg: "k" }, plane(${JSON.stringify(view)}, (x, z, col, row) => (col === 7 && row === 40 ? "w" : "g")))`, "t.px.js");
  const rows = keys(p, "p").split("\n");
  assert.equal(rows[45].indexOf("r"), 39, "near: in the middle");
  assert.ok(rows[31].indexOf("r") > 46, "far: off to the right");
  assert.equal(keys(p, "t"), keys(p, "p"));
  assert.equal(keys(p, "c").split("\n")[40][7], "w", "plane gives the pixel's column and row");
});

test("terrain: flat land paints what plane does; a hill rises over the horizon; the rest is sky", () => {
  const view = { w: 80, horizon: 30, eye: 2, fov: 90 };
  const flat = loadSource(PAL + `scene("t", { w: 80, h: 50, bg: "k" }, terrain(${JSON.stringify(view)}, () => 0, () => "g", { sky: () => "w" }))
scene("p", { w: 80, h: 50, bg: "w" }, plane(${JSON.stringify(view)}, () => "g"))`, "t.px.js");
  assert.equal(keys(flat, "t"), keys(flat, "p"));
  // a cone 300 m high, 1 km ahead: the middle columns see it above the horizon, the edges see sky
  const hill = loadSource(PAL + `scene("h", { w: 80, h: 50, bg: "k" },
  terrain(${JSON.stringify(view)}, (x, z) => Math.max(0, 300 - Math.hypot(x, z - 1000) * 0.6), (x, z, u) => (u > 1 ? "r" : "g"), { top: 300, sky: () => "w" }))`, "t.px.js");
  const rows = keys(hill, "h").split("\n");
  assert.equal(rows[20][40], "r", "the hill above the horizon in the middle");
  assert.equal(rows[20][2], "w", "sky at the edge");
  assert.equal(rows[45][40], "g", "the flat ground in front of it");
});

test("procedural texture: hash, vnoise and fbm stay in [0, 1], the same for the same input, with no seam between cells", () => {
  const h = [latticeHash(3, 4), latticeHash(3, 4), latticeHash(4, 3)]
  assert.equal(h[0], h[1]);
  assert.notEqual(h[0], h[2]);
  for (let i = 0; i < 200; i++) {
    const x = i * 0.37 - 20, y = i * 0.61 - 30, n = vnoise(x, y), f = fbm(x, y, 5)
    assert.ok(latticeHash(i, -i) >= 0 && latticeHash(i, -i) < 1 && n >= 0 && n <= 1 && f >= 0 && f <= 1)
  }
  assert.ok(Math.abs(vnoise(2.999999, 5.5) - vnoise(3, 5.5)) < 1e-4, "continuous across a cell's edge");
  assert.ok([0, 1, 2, 3].every((x) => bayer(x, 0) > 0 && bayer(x, 0) < 1));
  // and in an art file, under those names
  const p = loadSource(PAL + `sprite("ok", { w: 1, h: 1 }, (c) => c.px(0, 0, hash(1, 2) < 1 && vnoise(0.5, 0.5) <= 1 && fbm(1, 1) <= 1 && bayer(0, 0) > 0 ? "r" : "g"))`, "t.px.js");
  assert.equal(keys(p, "ok"), "r");
});

test("solids and shadows: a box drawn where the camera puts it, the face toward the sun lit, its shadow falling away from the sun; a ghost only casts", () => {
  const V = JSON.stringify({ w: 80, horizon: 20, eye: 2, fov: 90 });
  // a box 2 m wide, 1.5 m tall, 9-11 m ahead and 2 m right; the sun low on the left; a ghost ball on the left
  const p = loadSource(PAL + `const shapes = [solid.box([2, 9, 4, 11, 0, 1.5], { top: "w", lit: "w", shade: "r" }), solid.blob([-8, 10, 1], 1, 1, "r", { ghost: true })]
const opts = { sun: { from: [-1, 0], up: 30 }, shade: { g: "k" } }
scene("s", { w: 80, h: 50, bg: "g" }, shadows(${V}, shapes, opts), solids(${V}, shapes, opts))`, "t.px.js");
  const rows = keys(p, "s").split("\n");
  assert.equal(rows[25][48], "w", "the left face, toward the sun");
  assert.equal(rows[25][53], "r", "the front face, side-on to it");
  assert.equal(rows[28][62], "k", "the box's shadow, right of it");
  assert.equal(rows[28][40], "g", "none between them");
  assert.equal(rows[24][8], "g", "the ghost isn't drawn");
  assert.equal(rows[28][16], "k", "but casts");
  assert.match(failure(PAL + `scene("s", { w: 8, h: 8 }, shadows(${V}, [], {}))`, "s").message, /where the sun is/);
});

test("mesh: the nearest face per pixel, toned along its material's ramp by the light, outlined where it ends in front of another; a camera of one's own", () => {
  const V = JSON.stringify({ w: 40, horizon: 10, eye: 1, fov: 90 });
  // a wall 12 m ahead, a box 2 m wide and tall 4 m ahead in front of it: its front face spans columns 15-25, rows 5-15
  const p = loadSource(PAL + `const m = model()
m.face("wall", [-20, 12, 0], [20, 12, 0], [20, 12, 12], [-20, 12, 12])
m.box("box", [-1, 4, 0], [1, 6, 2])
scene("s", { w: 40, h: 30, bg: "k" }, mesh(${V}, m.faces, { wall: { ramp: "gg" }, box: { ramp: "rw", edge: "k" } }))`, "t.px.js");
  const rows = keys(p, "s").split("\n");
  assert.equal(rows[10][20], "w", "the box's front face, half toward the light: the ramp's lighter tone");
  assert.equal(rows[3][20], "g", "the wall above it");
  assert.equal(rows[10][15], "k", "the box's outline against the wall behind");
  assert.equal(rows[10][14], "g", "no line on the wall's side");
  // a camera of one's own, x right, y up, z ahead from the eye; a light of one's own
  const own = (light: number) => art(PAL + `const m = model(); m.face("a", [-1, -1, 4], [1, -1, 4], [1, 1, 4], [-1, 1, 4])
sprite("s", { w: 20, h: 20 }, mesh((p) => [10 + (20 * p[0]) / p[2], 10 - (20 * p[1]) / p[2], p[2]], m.faces, { a: { ramp: "krgw" } }, { light: () => ${light} }))`, "s").split("\n");
  assert.equal(own(0.99)[10][10], "w");
  assert.equal(own(0.4)[10][10], "r");
  assert.equal(own(0.4)[10][5], "k", "its edge, in the ramp's darkest by default");
  assert.match(failure(PAL + `const m = model(); m.face("a", [0, 1, 0], [1, 1, 0], [1, 1, 1])
sprite("s", { w: 8, h: 8 }, mesh(${V}, m.faces, { b: { ramp: "rw" } }))`, "s").message, /material 'a', which mats doesn't have/);
});

test("capsule: shaded across toward the light, the last key only along the lit edge", () => {
  const col = (s: string, x: number) => s.split("\n").map((r) => r[x]).join("");
  eq(col(art(PAL + 'sprite("c", { w: 20, h: 12 }, capsule(3, 6, 4, 16, 6, 4, "krgw", { light: [0, -1] }))', "c"), 10), "..wggrrrkk..");
});

test("flame: hottest at the root, the tip's key only up top, flickering from frame to frame and leaning with the wind", () => {
  const f = (o: string) => art(PAL + `sprite("f", { w: 24, h: 16 }, flame(12, 15, 10, "wrk", { ${o} }))`, "f").split("\n");
  const [a, b, left] = [f("frame: 0"), f("frame: 3"), f("frame: 0, wind: -0.55")];
  assert.notDeepEqual(a, b);
  const painted = a.map((r, y) => [r, y] as const).filter(([r]) => /[wrk]/.test(r));
  assert.match(painted.at(-1)![0], /w/, "white at the root");
  assert.doesNotMatch(painted[0][0], /w/, "not at the tip");
  // the same tongues blown the other way: the upper half sits further left
  const mean = (rows: string[]) => { let s = 0, n = 0; rows.slice(0, 10).forEach((r) => [...r].forEach((k, x) => { if (k !== ".") { s += x; n++ } })); return s / n };
  assert.ok(mean(left) < mean(a) - 2);
});

test("seamless: a function made to close over a width (and a height) runs into itself", () => {
  const f = seamless((x, y) => fbm(x / 7, y / 7), 20), g = seamless((x, y) => fbm(x / 7, y / 7), 20, 12);
  assert.ok(Math.abs(f(0, 3) - f(20, 3)) < 1e-9 && Math.abs(f(19.999, 3) - f(20, 3)) < 1e-3);
  assert.ok(Math.abs(g(5, 0) - g(5, 12)) < 1e-9 && Math.abs(g(5, 11.999) - g(5, 12)) < 1e-3);
});

test("shapes far off the picture cost only the pixels they can reach: a vertex millions away, a huge circle", () => {
  eq(art(PAL + 'sprite("t", { w: 4, h: 2 }, poly([0, 0, 1e7, 0, 0, 1e7], "r"))', "t"), "rrrr\nrrrr");
  eq(art(PAL + 'sprite("c", { w: 4, h: 2 }, circ(2, 1e6, 1e6 + 1, "w"))', "c"), "wwww\nwwww");
});

test("stamp smear: the silhouette swept from where it was, in one key under it (its lightest by default)", () => {
  const P = 'pal({ k: "#1b1630", r: "#e2585e", w: "#fff6e0" }); sprite("dot", "rr\\nrk"); ';
  assert.equal(art(P + 'sprite("t", { w: 10, h: 2 }, stamp("dot", 6, 0, { smear: { from: [0, 0], c: "w" } }))', "t"), "wwwwwwrr..\nwwwwwwrk..");
  assert.equal(art(P + 'sprite("t", { w: 10, h: 2 }, stamp("dot", 2, 0, { smear: [6, 0] }))', "t"), "..rrrrrr..\n..rkrrrr..", "from the right, in its lightest color (r)");
  assert.throws(() => loadSource(P + 'sprite("t", { w: 4, h: 2 }, stamp("dot", 0, 0, { smear: 3 }))', "t.px.js").image("t"), /smear is \[x, y\] where it was/);
});

test("aa: a strip half the step long on the lighter side, in the key between; none on a 1:1 step, against the clear, or without a key between", () => {
  const P = 'pal({ k: "#1b1630", K: "#6a5a7c", w: "#e8dcc0", r: "#c83a3a" }); ramps("kKw"); ';
  // a 4 px step of light over dark: its first 2 px take the key between
  assert.equal(art(P + 'sprite("t", { aa: true }, "kkkkwwww\\nkkkkkkkk")', "t"), "kkkkKKww\nkkkkkkkk");
  assert.equal(art(P + 'sprite("t", { aa: true }, "kwww\\nkkww\\nkkkw")', "t"), "kwww\nkkww\nkkkw", "1:1");
  assert.equal(art(P + 'sprite("t", { aa: true }, "....wwww\\nkkkkkkkk")', "t"), "....wwww\nkkkkkkkk", "the clear isn't a color");
  assert.equal(art(P + 'sprite("t", { aa: true }, "kkkkrrrr\\nkkkkkkkk")', "t"), "kkkkrrrr\nkkkkkkkk", "no key between k and r");
  assert.throws(() => loadSource(P + 'sprite("t", { aa: 1 }, "kw")', "t.px.js").image("t"), /aa is true or false/);
});

test("stamp sub: half a pixel along, it stays where it comes from and its edges move: into its own outline, or spilling over paint; else it rounds", () => {
  const pal = 'pal({ k: "#17111c", r: "#9e4e54", w: "#f0f0f0", f: "#c79fa2", d: "#202030" }); sprite("b", { w: 2, h: 2 }, rect(0, 0, 2, 2, "w")); ';
  const on = (src: string, st: string) => art(src + `scene("s", { w: 6, h: 6, bg: "r" }, ${st})`, "s");
  // half a pixel down: crisp where it's past, and below its edge f, the key between w and r
  const rows = (...r: string[]) => r.join("\n");
  assert.equal(on(pal, 'stamp("b", 2, 2.5, { sub: true })'), rows("rrrrrr", "rrrrrr", "rrwwrr", "rrwwrr", "rrffrr", "rrrrrr"));
  // across, and both ways (the corner too)
  assert.equal(on(pal, 'stamp("b", 2.5, 2, { sub: true })'), rows("rrrrrr", "rrrrrr", "rrwwfr", "rrwwfr", "rrrrrr", "rrrrrr"));
  assert.equal(on(pal, 'stamp("b", 2.5, 2.5, { sub: true })'), rows("rrrrrr", "rrrrrr", "rrwwfr", "rrwwfr", "rrfffr", "rrrrrr"));
  // nearer a whole place it's there; a whole place is a plain stamp
  assert.equal(on(pal, 'stamp("b", 2, 2.25, { sub: true })'), on(pal, 'stamp("b", 2, 2)'));
  assert.equal(on(pal, 'stamp("b", 2, 2.75, { sub: true })'), on(pal, 'stamp("b", 2, 3)'));
  // an eye half a pixel along in a face: the skin past it takes the key between
  assert.equal(art(pal + 'sprite("eye", { w: 1, h: 1 }, px(0, 0, "d")); sprite("s", { w: 4, h: 1 }, rect(0, 0, 4, 1, "w"), stamp("eye", 1.5, 0, { sub: true }))', "s"), "wdfw");
  // no key between w and r in the file's palette (pico8's own colors don't count when it never said
  // use("pico8")), or on clear: nothing spills
  const bare = 'pal({ r: "#9e4e54", w: "#f0f0f0" }); sprite("b", { w: 2, h: 2 }, rect(0, 0, 2, 2, "w")); ';
  assert.equal(on(bare, 'stamp("b", 2, 2.5, { sub: true })'), on(bare, 'stamp("b", 2, 2)'));
  assert.equal(art(pal + 'sprite("s", { w: 6, h: 6 }, stamp("b", 2, 2.5, { sub: true }))', "s"), art(pal + 'sprite("s", { w: 6, h: 6 }, stamp("b", 2, 2))', "s"));
  // an option only stamp takes
  assert.throws(() => art(pal + 'sprite("s", { w: 6, h: 6 }, tile("b", 0, 0, 2, 2, { sub: true }))', "s"), /sub/);
  // with an outline, over clear too (a game sprite): it pushes into its own outline, the silhouette
  // stays: the outline ahead takes the key between it and the fill (its ramp's), the fill behind the
  // outline it leaves the same; moving up ([0, -1]) it's still where it comes from, the other way round
  const ring = 'pal({ k: "#17111c", G: "#7a7a86", w: "#f0f0f0" }); ramps("kGw"); sprite("o", { w: 4, h: 4 }, rect(0, 0, 4, 4, "k"), rect(1, 1, 2, 2, "w")); ';
  const clear = (st: string) => art(ring + `sprite("s", { w: 6, h: 8 }, ${st})`, "s");
  assert.equal(clear('stamp("o", 1, 2.5, { sub: true })'), rows("......", "......", ".kkkk.", ".kGGk.", ".kwwk.", ".kGGk.", "......", "......"));
  assert.equal(clear('stamp("o", 1, 2.5, { sub: [0, -1] })'), rows("......", "......", "......", ".kGGk.", ".kwwk.", ".kGGk.", ".kkkk.", "......"));
  // the key from the part's own ramp, though another ramp's key lies nearer the middle of the two
  const reds = 'pal({ k: "#000000", D: "#7a1414", R: "#c03030", B: "#5c2a24" }); ramps("kDR", "kB"); sprite("r", { w: 2, h: 2 }, rect(0, 0, 2, 2, "R")); ';
  assert.equal(art(reds + 'scene("s", { w: 4, h: 4, bg: "k" }, stamp("r", 1, 0.5, { sub: true }))', "s"), rows("kRRk", "kRRk", "kDDk", "kkkk"));
  assert.throws(() => clear('stamp("o", 1, 2.5, { sub: "down" })'), /sub is true, or \[dx, dy\]/);
  // drawn in code: c.subpixel moves what it draws the same way
  assert.equal(on(pal, '(c) => c.subpixel(0, 0.5, () => c.rect(2, 2, 2, 2, "w"))'), rows("rrrrrr", "rrrrrr", "rrwwrr", "rrwwrr", "rrffrr", "rrrrrr"));
  assert.equal(on(pal, '(c) => c.subpixel(1, 1, () => c.rect(1, 1, 2, 2, "w"))'), on(pal, 'rect(2, 2, 2, 2, "w")'));
});

test("stamp sub: half a pixel along with nothing to show it is a warning (over the clear, no outline)", () => {
  const src = 'pal({ k: "#1b1630", r: "#e2585e", R: "#a63a4c" }); ramps("kRr"); sprite("dot", "rr"); sprite("_o", { outline: "k" }, "rr")\n';
  const bare = loadSource(src + 'sprite("a", { w: 6, h: 3 }, stamp("dot", 1.5, 1, { sub: true }))', "t.px.js");
  bare.image("a");
  assert.match(bare.warnings[0]?.msg ?? "", /^'a': a stamp half a pixel along drew no in-between tone/);
  const lined = loadSource(src + 'sprite("a", { w: 8, h: 5 }, stamp("_o", 1.5, 1, { sub: true }))', "t.px.js");
  lined.image("a");
  assert.equal(lined.warnings.length, 0, "an outline to push into: the in-between shows");
});

test("ramps: one written light to dark gets a warning (shade and light would swap); dark to light none", () => {
  const p = loadSource('pal({ k: "#000000", d: "#404040", l: "#c0c0c0" }); ramps("kdl", "ldk"); sprite("a", { w: 1, h: 1 }, px(0, 0, "d"))', "t.px.js");
  p.image("a");
  assert.deepEqual(p.warnings.map((w) => w.msg.match(/ramp "(\w+)" isn't dark to light/)?.[1]), ["ldk"]);
});
