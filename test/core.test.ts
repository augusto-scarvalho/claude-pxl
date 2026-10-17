import { test } from "node:test";
import assert from "node:assert/strict";
import { art, failure, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";
import { compareSilhouettes, packSheet, sheetJson } from "../src/core/render.ts";
import { pack } from "../src/core/color.ts";
import { readJoints } from "../src/core/pose.ts";
import { rotate } from "../src/core/rotate.ts";
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
    "r.......r\n.rr...rr.\n..rrrrr..\n....w....");
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
