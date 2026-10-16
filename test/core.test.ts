import { test } from "node:test";
import assert from "node:assert/strict";
import { art, failure, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";
import { packSheet, sheetJson } from "../src/core/render.ts";

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
