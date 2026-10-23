// mesh() as a stage: textured faces, sprites standing among them in one depth, contact shadows, and
// faces that reach behind the eye. A level camera 1 m up, the horizon on row 10, 40 px of focal
// length: a point z m ahead and u m up lands on row 10 + 40 (1 - u) / z.
import { test } from "node:test";
import assert from "node:assert/strict";
import { failure, keys, PAL } from "./helpers.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadProject, loadSource } from "../src/node/load.ts";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { encodePng } from "../src/node/png.ts";

const STAGE = `ramps("kgw")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }
sprite("s", { w: 2, h: 20, pivot: "bottom" }, rect(0, 0, 2, 20, "r"))
sprite("_white", "w")
`;
const rows = (body: string) => keys(loadSource(PAL + STAGE + body, "t.px.js"), "a").split("\n");

test("mesh sprites: a wall hides what stands behind it below its top, and nothing in front of it", () => {
  // the wall's top, 0.5 m up at z 3.2, on row 16.25; its foot at z 3 on row 23.3
  const wall = `const M = model(); M.box("stone", [-1, 3, 0], [1, 3.2, 0.5])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { stone: { ramp: "kgw" } }, { sprites: [{ name: "s", at: [0, Z], shadow: 0 }] }))`;
  const behind = rows(`const Z = 4\n${wall}`), front = rows(`const Z = 2.5\n${wall}`);
  // behind (feet on row 20): seen above the wall's top, hidden below it
  assert.equal(behind[10][20], "r");
  assert.notEqual(behind[18][20], "r", "below the wall's top");
  // in front (feet on row 26): over the wall
  assert.equal(front[18][20], "r");
});

test("mesh textures: tiled in meters, stepped by the light; contact shadows; faces reaching behind the eye", () => {
  const r = rows(`const M = model()
M.face("floor", [-5, -5, 0], [5, -5, 0], [5, 20, 0], [-5, 20, 0])
M.box("block", [1, 3, 0], [2, 4, 1])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { floor: { tex: "_white" }, block: { tex: "_white" } }, { sprites: [{ name: "s", at: [-1, 4], shadow: 0.6 }] }))`);
  // the floor runs from behind the eye out to z 20 (row 12): the bottom row is still floor
  assert.equal(r[39][5], "w", "a face reaching behind the eye is drawn up to it");
  assert.equal(r[30][5], "w", "the floor, lit from above, as the texture is drawn");
  // the block's faces toward us and to its left (columns 33 on) take less of the sun than its top
  assert.ok(r.some((row) => row.includes("g")), "a face turned from the light a step darker");
  // under the sprite's feet (column 10, row 20: z 3.8 there, 3.5 a row down): the floor two steps
  // darker in the shadow's middle, one out to its 0.6 m
  assert.equal(r[20][10], "k");
  assert.equal(r[21][10], "g");
  assert.equal(r[21][2], "w", "away from the feet, untouched");
});

test("mesh sprites: errors say what a sprite is and where sprites can stand", () => {
  const scene = (sprites: string, view = "V") => PAL + STAGE + `scene("a", { w: 40, h: 40 }, (c) => c.mesh(${view}, [], {}, { sprites: ${sprites} }))`;
  assert.match(failure(scene(`[{ name: "s", at: [0] }]`), "a").message, /sprite 0 is \{ name, at: \[x, z\] or \[x, z, up\]/);
  assert.match(failure(scene(`[{ name: "s", at: [0, 4] }]`, "(p) => [p[0], p[1], p[2]]"), "a").message, /sprites need a perspective view/);
  assert.match(failure(scene(`[]`).replace("{}, { sprites: [] }", '{ m: { tex: "_white", texel: 0 } }, {}'), "a").message, /texel 0: a texel's size in m/);
});

// post() over a checkered floor from z 1.5 out: row 10 + 40 / z, so row 30 is 2 m away, row 12 is 20
const FLOOR = `sprite("_check", "kw\\nwk")
const M = model(); M.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
const floor = (c) => c.mesh(V, M.faces, { f: { tex: "_check", texel: 0.25 } })
`;
test("post: the depth in focus stays as drawn, in the palette; farther is blurred, hazed, and off it", () => {
  const r = rows(FLOOR + `scene("a", { w: 40, h: 40 }, floor, post({ blur: 3, focus: [20, 30], sharp: 0.3, soft: 0.5, fog: { color: "r", from: 10, to: 20, max: 0.5 } }))`);
  assert.ok(!r[30].includes("?"), `in focus: ${r[30]}`);
  assert.ok([...r[12]].filter((k) => k === "?").length > 30, `far: ${r[12]}`);
  const p = loadSource(PAL + STAGE + FLOOR + `scene("a", { w: 40, h: 40 }, floor, post({ fog: { color: "r", from: 10, to: 20 } }))`, "t.px.js");
  const far = p.image("a").get(5, 12);
  assert.ok(far >>> 24 > ((far >>> 16) & 255) + 40, "far away, the haze's red");
  assert.ok(!keys(p, "a").split(String.fromCharCode(10))[30].includes("?"), "near, untouched");
});

test("post: errors; a sprite's pixel can be K x K; a scene saying check: false isn't checked", async () => {
  assert.match(failure(PAL + STAGE + `scene("a", { w: 40, h: 40, bg: "w" }, post({ blur: 3 }))`, "a").message, /put post\(\) after a mesh\(\)/);
  assert.match(failure(PAL + STAGE + FLOOR + `scene("a", { w: 40, h: 40 }, floor, post({ blur: 3, focus: [20, 2] }))`, "a").message, /drew nothing at the focus \[20, 2\]/);
  const big = rows(`scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, [], {}, { sprites: [{ name: "_white", at: [0, 4], shadow: 0 }], pixel: 3 }))`);
  const at = big.flatMap((l, y) => [...l].flatMap((k, x) => (k === "w" ? [[x, y]] : [])));
  assert.equal(at.length, 9, "one pixel, 3 x 3");
  assert.deepEqual([0, 1].map((e) => Math.max(...at.map((p) => p[e])) - Math.min(...at.map((p) => p[e]))), [2, 2]);
  const { checkProject } = await import("../src/node/check.ts");
  const p = loadSource(PAL + STAGE + FLOOR + `scene("a", { w: 40, h: 40, check: false }, floor)`, "t.px.js", { checksOnly: true });
  assert.match(checkProject(p).notes.join("\n"), /a › not checked \(check: false\)/);
});

// light in the world over a white floor, a 1 m block at x 0..0.3, z 3..4, the sun low on the left
const LIT = `const B = model()
B.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0]); B.box("f", [0, 3, 0], [0.3, 4, 1])
sprite("_ball", { w: 8, h: 8, pivot: "bottom" }, circ(3, 3, 3, "w"), bump("hybrid"))
const lit = (o) => (c) => c.mesh(V, B.faces, { f: { tex: "_white" } }, { light: [-1, 0, 0.8], sun: "w", sky: { color: "w", strength: 0.2 }, ...o })
`;
const red = (body: string, x: number, y: number, opts = {}) => loadSource(PAL + STAGE + LIT + body, "t.px.js", opts).image("a").get(x, y) >>> 24;

test("mesh light: the sun's shadow, a lamp's pool, what gives light, a sprite's normals; none when only checking", () => {
  // the floor at x 0.6, z 3.5 (column 27, row 21) is behind the block from the sun, at x -0.6 (column 13) it isn't
  const scene = (o: string) => `scene("a", { w: 40, h: 40 }, lit(${o}))`;
  assert.ok(red(scene("{}"), 13, 21) > red(scene("{}"), 27, 21) + 40, "in the block's shadow");
  assert.equal(red(scene("{ shadows: false }"), 27, 21), red(scene("{ shadows: false }"), 13, 21), "no shadows: lit alike");
  // a lamp at x -1, z 5, 2 m: the floor under it (column 12, row 18) against beyond its reach (column 30)
  const lamp = `{ sun: { color: "w", strength: 0 }, lamps: [{ at: [-1, 5, 0.5], color: "w", r: 2, strength: 2 }] }`;
  assert.ok(red(scene(lamp), 12, 18) > red(scene(lamp), 30, 18) + 40, "the lamp's pool");
  assert.equal(rows(LIT + scene(`{ emit: "w" }`))[21][27], "w", "what gives light is drawn as it is, shadow or not");
  // a ball with a normal map standing at z 4 (columns 16..23, rows 12..19): its side toward the sun lighter
  const ball = `scene("a", { w: 40, h: 40 }, lit({ shadows: false, sprites: [{ name: "_ball", at: [0, 4], shadow: 0 }] }))`;
  assert.ok(red(ball, 17, 16) > red(ball, 22, 16) + 20, "lit on its left");
  assert.equal(red(scene("{}"), 27, 21, { checksOnly: true }), red(`scene("a", { w: 1, h: 1, bg: "w" })`, 0, 0), "only checking: as drawn");
  // a slab 2 m wide and 1 m tall drawn at z 4 (columns 10..29, its foot on row 20), the sun behind on
  // the left: its shadow starts all along its foot, on the left too (column 12, just in front of it),
  // and runs past its right (column 31); the floor far to its left (column 3) is lit
  const slab = `sprite("_slab", { w: 20, h: 10, pivot: "bottom" }, rect(0, 0, 20, 10, "r"))
const F = model(); F.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, F.faces, { f: { tex: "_white" } }, { light: [-1, 1, 0.8], sun: "w", sky: { color: "w", strength: 0.2 }, sprites: [{ name: "_slab", at: [0, 4], shadow: 0 }] }))`;
  assert.ok(red(slab, 12, 20) + 40 < red(slab, 3, 20), "in its shadow right in front of its foot, on its left");
  assert.ok(red(slab, 31, 20) + 40 < red(slab, 3, 20), "and past its right");
});

test("mesh textures: their clear pixels are holes; anchored to the face they start at its top left", () => {
  // a fence 1 m high at z 3, x -0.9 to 1.1, of bars 0.25 m wide (red, then clear), over a white floor
  const fence = (anchor: string) => rows(`sprite("_bars", "r.")
const M = model()
M.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0]); M.face("b", [-0.9, 3, 0], [1.1, 3, 0], [1.1, 3, 1], [-0.9, 3, 1])
scene("a", { w: 40, h: 40, bg: "k" }, (c) => c.mesh(V, M.faces, { f: { tex: "_white" }, b: { tex: "_bars", texel: 0.25, ${anchor} } }))`);
  // x -0.8 (column 9) is in the first bar either way; x -0.7 (column 10) in it only from the face's edge
  const face = fence(`anchor: "face"`), world = fence(`anchor: "world"`);
  assert.equal(face[18][9], "r");
  assert.equal(face[18][10], "r", "the bars start at the face's left");
  assert.equal(world[18][10], "w", "tiled from the world's origin, a hole there: the floor behind shows through");
  // two texels, across and down: the bars 0.5 m wide (x -0.6, 0.3 m in, is in the first)
  assert.equal(face[18][11], "w");
  assert.equal(fence(`anchor: "face", texel: [0.5, 1]`)[18][11], "r");
  assert.throws(() => fence(`texel: [0.5]`), /texel \[0\.5\].*or two, across and down/);
});

test("mesh block: a material drawn in blocks of N px, its outline only under it and away from the light; a texture with an edge", () => {
  const r = rows(`const M = model(); M.box("b", [-1, 3, 0], [1, 3.6, 1.2])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { b: { ramp: "kgw", block: 4 } }))`);
  // every 4 x 4 block of the picture one key
  for (let y = 0; y < 40; y += 4) for (let x = 0; x < 40; x += 4) {
    const keysIn = new Set(Array.from({ length: 16 }, (_, i) => r[y + (i >> 2)][x + (i & 3)]));
    assert.equal(keysIn.size, 1, `block at ${x},${y}: ${[...keysIn].join("")}`);
  }
  // the light from the upper left: the outline (the ramp's darkest) on its right, not on its left
  const row = r.find((l) => l.replace(/\./g, "").length >= 12)!, ink = row.replace(/^\.+|\.+$/g, "");
  assert.equal(ink.at(-1), "k");
  assert.notEqual(ink[0], "k");
  // a textured face with an edge: the outline where it ends, the texture inside it
  const t = rows(`const M = model(); M.box("b", [-1, 3, 0], [1, 3.6, 1.2])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { b: { tex: "_white", edge: "k" } }))`).join("");
  assert.ok(t.includes("k") && t.includes("g"), "edge and texture (stepped down by its light) both drawn");
});

// post's finish on a picture of its own (no mesh needed): a dark ground, a lit stripe, a bright spot
const PIC = `const pic = [rect(0, 0, 64, 40, "#30303a"), rect(0, 20, 64, 2, "#9a8a70"), rect(30, 8, 3, 3, "#fffaf0"), rect(10, 30, 8, 6, "#5a7aa0")]\n`;
const finish = (o: string, src = "") => loadSource(PAL + PIC + src + `scene("a", { w: 64, h: 40, frames: 4 }, ...pic, post(${o}))`, "t.px.js");
const same = (a: { data: Uint32Array }, b: { data: Uint32Array }) => a.data.every((c, i) => c === b.data[i]);

test("post finish: strength 0 changes nothing; Three's bloom spreads farther than pxl's; dark pictures don't bloom", () => {
  const plain = finish("{}").image("a");
  for (const o of ["{ bloom: { strength: 0, levels: 5 } }", "{ bloom: 0 }", "{ grain: 0, pixel: 2 }", "{ sharpen: 0 }"]) assert.ok(same(finish(o).image("a"), plain), o);
  const lift = (o: string, x: number, y: number) => (finish(o).image("a").get(x, y) >>> 24) - (plain.get(x, y) >>> 24);
  assert.ok(lift("{ bloom: { strength: 1, above: 0.9, levels: 5 } }", 31, 2) > 0 && lift("{ bloom: { strength: 1, above: 0.9, r: 3 } }", 31, 2) === 0, "8 px from the spot: only the levels reach");
  assert.ok(lift("{ bloom: { strength: 1, above: 0.9, levels: 5 } }", 33, 9) > 0, "round the spot both do");
  assert.ok(same(finish("{ bloom: { strength: 1, above: 0.99, levels: 5 } }").image("a"), plain), "nothing that bright: nothing added");
  assert.match(failure(PAL + PIC + `scene("a", { w: 64, h: 40 }, post({ bloom: { levels: 5, r: 4 } }))`, "a").message, /give levels or r, not both/);
});

test("post finish: grain is the frame's, in blocks of pixel, and the same each time; sharpen steps edges apart, flat stays flat", () => {
  const f = finish("{ grain: 0.2, pixel: 2 }").frames("a");
  assert.ok(same(f[1].img, finish("{ grain: 0.2, pixel: 2 }").frames("a")[1].img), "the same frame, the same grain");
  assert.ok(!same(f[0].img, f[1].img), "another frame, another grain");
  const still = finish("{ grain: { amount: 0.2, animated: false }, pixel: 2 }").frames("a");
  assert.ok(same(still[0].img, still[1].img) && !same(still[0].img, finish("{}").image("a")), "animated: false: a grain, the same in every frame");
  const g = f[0].img, blocks = [0, 2, 4, 6].every((x) => [0, 2, 4].every((y) => g.get(x, y) === g.get(x + 1, y) && g.get(x, y) === g.get(x, y + 1) && g.get(x, y) === g.get(x + 1, y + 1)));
  assert.ok(blocks, "2 x 2 blocks");
  const plain = finish("{}").image("a"), sharp = finish("{ sharpen: 0.5 }").image("a");
  assert.equal(sharp.get(50, 5), plain.get(50, 5), "the flat ground as it was");
  assert.ok((sharp.get(50, 20) >>> 24) > (plain.get(50, 20) >>> 24) && (sharp.get(50, 19) >>> 24) < (plain.get(50, 19) >>> 24), "the stripe's edge steeper: lighter inside, darker out");
});

test("post finish: a .cube LUT grades (identity changes nothing, amount mixes), a LUT strip as its .cube does, the palette takes the picture back", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-lut-"));
  try {
    const cube = (f: (r: number, g: number, b: number) => number[]) => {
      const lines = ["LUT_3D_SIZE 2"];
      for (const b of [0, 1]) for (const g of [0, 1]) for (const r of [0, 1]) lines.push(f(r, g, b).join(" "));
      return lines.join("\n");
    };
    writeFileSync(join(dir, "same.cube"), cube((r, g, b) => [r, g, b]));
    writeFileSync(join(dir, "neg.cube"), "# negative\nTITLE \"neg\"\n" + cube((r, g, b) => [1 - r, 1 - g, 1 - b]));
    writeFileSync(join(dir, "flat.cube"), "LUT_1D_SIZE 2\n0 0 0\n1 1 1\n");
    // the negative as a strip: two tiles of 2 x 2, red across a tile, green down it, blue tile by tile
    const strip = new Img(4, 2);
    for (const b of [0, 1]) for (const g of [0, 1]) for (const r of [0, 1]) strip.set(b * 2 + r, g, pack(255 * (1 - r), 255 * (1 - g), 255 * (1 - b)));
    writeFileSync(join(dir, "neg.png"), encodePng(strip));
    writeFileSync(join(dir, "odd.png"), encodePng(new Img(5, 2)));
    const at = (o: string) => { writeFileSync(join(dir, "a.px.js"), PAL + PIC + `scene("a", { w: 64, h: 40 }, ...pic, post(${o}))`); return loadProject(join(dir, "a.px.js")).image("a"); };
    const plain = at("{}");
    assert.ok(same(at('{ lut: "same.cube" }'), plain), "the identity LUT");
    assert.ok(same(at('{ lut: { cube: "neg.cube", amount: 0 } }'), plain), "amount 0");
    assert.equal(at('{ lut: "neg.cube" }').get(5, 5), 0xcfcfc5ff, "#30303a inverted");
    assert.equal(at('{ lut: { cube: "neg.cube", amount: 0.5 } }').get(5, 5) >>> 24, Math.round(0x30 + (0xcf - 0x30) * 0.5));
    assert.throws(() => at('{ lut: "flat.cube" }'), /a 1D LUT/);
    assert.ok(same(at('{ lut: "neg.png" }'), at('{ lut: "neg.cube" }')), "the strip grades as the cube");
    assert.throws(() => at('{ lut: "odd.png" }'), /n tiles of n x n side by side/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const keyed = new Set(finish("{}").assets.get("a")!.pal.chosen());
  assert.ok([...finish("{ bloom: 1, palette: true, pixel: 2 }").image("a").data].every((c) => keyed.has(c)), "every color the palette's");
  const two = finish('{ palette: { keys: "kw", dither: 0 } }').image("a");
  assert.ok([...two.data].every((c) => c === 0x000000ff || c === 0xfff1e8ff), "those keys, the nearest: no checker");
});

test("mesh: a blended sprite's veil, a faint shadow by its alpha; a lamp for each glowing part", () => {
  const F = `const F = model(); F.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])\n`;
  // the sun behind a half-clear slab: no shadow, then one as faint as its veil, a solid one the darkest
  const slab = (fill: string, o: string) => loadSource(PAL + STAGE + F + `sprite("_slab", { w: 20, h: 10, pivot: "bottom" }, rect(0, 0, 20, 10, "${fill}"))
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, F.faces, { f: { tex: "_white" } }, { light: [-1, 1, 0.8], sun: "w", sky: { color: "w", strength: 0.2 }, sprites: [{ name: "_slab", at: [0, 4], shadow: 0${o} }] }))`, "t.px.js").image("a").get(30, 22) >>> 24;
  const solid = slab("r", ""), none = slab("#ff000080", ', blend: "alpha"'), half = slab("#ff000080", ', blend: "alpha", veil: 0.5'), full = slab("#ff000080", ', blend: "alpha", veil: 1');
  assert.ok(solid < full && full < half && half < none, `solid ${solid} < veil 1 ${full} < veil 0.5 ${half} < none ${none}`);
  assert.match(failure(PAL + STAGE + F + `sprite("_slab", { w: 2, h: 2 }, rect(0, 0, 2, 2, "r"))
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, F.faces, { f: { tex: "_white" } }, { sprites: [{ name: "_slab", at: [0, 4], veil: 0.5 }] }))`, "a").message, /blended "alpha"/);
  // two gems apart on one sprite: one lamp between them, or one on each (each: true)
  const gems = (o: string) => loadSource(PAL + STAGE + F + `sprite("_two", { w: 16, h: 4, pivot: "bottom" }, rect(0, 0, 3, 3, "#30a0e0"), rect(13, 0, 3, 3, "#30a0e0"), effect("emit", { strength: 1 }))
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, F.faces, { f: { tex: "_white" } }, { light: [-1, 0, 0.8], sun: { color: "w", strength: 0.1 }, sky: { color: "w", strength: 0.1 }, shadows: false, sprites: [{ name: "_two", at: [0, 4], shadow: 0${o} }] }))`, "t.px.js").image("a");
  const one = gems(""), each = gems(", light: { each: true }"), blue = (i: Img, x: number, y: number) => (i.get(x, y) >>> 8) & 255;
  assert.ok(blue(each, 13, 20) > blue(one, 13, 20) + 10 && blue(each, 27, 20) > blue(one, 27, 20) + 10, "the floor by each gem lit more");
  assert.ok(blue(each, 20, 21) < blue(one, 20, 21), "the middle, where the one lamp was, less");
});

// what gives light, dissolving faces and sprites, blended sprites (phase 4 of the shader plan)
const GLOW = `const N = model(); N.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
sprite("_gem", { w: 4, h: 4, pivot: "bottom" }, rect(0, 0, 4, 4, "#30a0e0"))
sprite("_gem_lit", { base: "_gem" }, effect("emit", { strength: 1 }))
const night = (sprites, o = {}) => (c) => c.mesh(V, N.faces, { f: { tex: "_white" } }, { light: [-1, 0, 0.8], sun: { color: "w", strength: 0.1 }, sky: { color: "w", strength: 0.1 }, shadows: false, sprites, ...o })
`;
const glow = (body: string) => loadSource(PAL + STAGE + GLOW + body, "t.px.js").image("a");

test("mesh emission: what gives light is drawn as it is and lights the floor round it, as a lamp; the bloom takes it", () => {
  const lit = glow(`scene("a", { w: 40, h: 40 }, night([{ name: "_gem_lit", at: [0, 4], shadow: 0 }]))`);
  const off = glow(`scene("a", { w: 40, h: 40 }, night([{ name: "_gem_lit", at: [0, 4], shadow: 0, light: false }]))`);
  const plain = glow(`scene("a", { w: 40, h: 40 }, night([{ name: "_gem", at: [0, 4], shadow: 0 }]))`);
  const gem = loadSource(PAL + STAGE + GLOW, "t.px.js").image("_gem_lit").get(1, 1);
  assert.equal(lit.get(19, 18), gem, "its pixels as they are, in the night");
  assert.ok((plain.get(19, 18) >>> 8 & 255) < (gem >>> 8 & 255), "a gem that gives no light is darkened");
  assert.ok((lit.get(20, 23) >>> 8 & 255) > (off.get(20, 23) >>> 8 & 255) + 20, "the floor just in front of it lit blue");
  assert.equal(off.get(20, 23), plain.get(20, 23), "light: false: none");
  assert.equal(lit.get(20, 11), off.get(20, 11), "far away, nothing");
  for (const b of ["{ above: 1, strength: 2, r: 3 }", "{ above: 1, strength: 2, levels: 4 }"]) {
    const bloomed = glow(`scene("a", { w: 40, h: 40 }, night([{ name: "_gem_lit", at: [0, 4], shadow: 0, light: false }]), post({ bloom: ${b} }))`);
    assert.ok((bloomed.get(23, 18) >>> 8 & 255) > (off.get(23, 18) >>> 8 & 255), `${b}: nothing is that bright, but what gives light blooms`);
  }
});

test("mesh dissolve: a face's holes show what is behind it and let the sun through; progress 0 changes nothing", () => {
  const wall = (d: string, sun = "") => rows(`const D = model(); D.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0]); D.box("stone", [-1.5, 3, 0], [1.5, 3.2, 1.5])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, D.faces, { f: { tex: "_white" }, stone: { ramp: "kg"${d} } }, { sprites: [{ name: "s", at: [0, 4], shadow: 0 }]${sun} }))`);
  assert.deepEqual(wall(", dissolve: { progress: 0 }"), wall(""), "progress 0");
  const whole = wall(""), holed = wall(", dissolve: { progress: 0.5, scale: 0.15 }");
  const seen = (r: string[]) => r.slice(5, 20).filter((row) => row.slice(19, 21).includes("r")).length;
  assert.equal(seen(whole), 0, "the figure behind the wall is hidden");
  assert.ok(seen(holed) > 0, "seen through the holes");
  assert.ok(wall(", dissolve: { progress: 0.3, scale: 0.15, edge: \"w\", width: 0.2 }").slice(5, 23).some((row) => row.slice(8, 32).includes("w")), "the burning edge in its key");
  // its looks, as a sprite's: neutral by default (a ring lighter than the face), none with edge: false; acid's green char
  const flat = (d: string) => loadSource(PAL + STAGE + `sprite("_grey", { w: 4, h: 1 }, rect(0, 0, 4, 1, "#707070"), px(3, 0, "#c0c0c0"))
const D = model(); D.box("stone", [-1.5, 3, 0], [1.5, 3.2, 1.5])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, D.faces, { stone: { tex: "_grey"${d} } }))`, "t.px.js").image("a");
  const none = flat(', dissolve: { progress: 0.4, scale: 0.15, edge: false }'), neu = flat(', dissolve: { progress: 0.4, scale: 0.15 }'), acid = flat(', dissolve: { progress: 0.4, scale: 0.15, look: "acid" }');
  const between = (img: Img) => img.data.filter((c) => c >>> 24 > 0x80 && c >>> 24 < 0xb0).length;
  assert.equal(between(none), 0, "edge: false: the face as it is, its two tones");
  assert.ok(between(neu) > 0, "neutral: a ring halfway to its lightest tone");
  assert.ok(acid.data.some((c) => ((c >>> 16) & 255) > (c >>> 24) + 30), "acid: green at the edge");
  // a sweep from the top: its upper half gone, the lower whole
  const top = wall(', dissolve: { progress: 0.5, pattern: "top", ragged: 0 }');
  assert.ok(top.slice(5, 12).every((row) => row[20] === "r") && top.slice(15, 20).every((row) => row[20] !== "r"), top.slice(3, 22).map((r) => r.slice(16, 25)).join("|"));
  // the sun behind the wall: its shadow on the floor in front, with the same holes
  const sun = (d: string) => loadSource(PAL + STAGE + `const D = model(); D.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0]); D.box("stone", [-1.5, 3, 0], [1.5, 3.2, 1.5])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, D.faces, { f: { tex: "_white" }, stone: { tex: "_white"${d} } }, { light: [-0.3, 1, 0.8], sun: "w", sky: { color: "w", strength: 0.2 } }))`, "t.px.js").image("a");
  const light = (img: { get(x: number, y: number): number }) => { let s = 0; for (let y = 25; y < 40; y++) for (let x = 0; x < 40; x++) s += img.get(x, y) >>> 24; return s; };
  assert.ok(light(sun(", dissolve: { progress: 0.6, scale: 0.15 }")) > light(sun("")) * 1.1, "more of the floor lit through the holes in its shadow");
});

test("mesh blend: smoke laid over what is behind by its alpha, hidden by what stands in front, no shadow; a dissolving sprite's shadow has its holes", () => {
  const SM = `sprite("_grey", { w: 1, h: 1 }, px(0, 0, "#606060"))
sprite("_puff", { w: 6, h: 6, pivot: "bottom" }, rect(0, 0, 6, 6, "#ffffff80"))
const P = model(); P.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
const smoke = (s, wall = false) => (c) => { if (wall) P.box("f", [-1, 3, 0], [1, 3.2, 1]); c.mesh(V, P.faces, { f: { tex: "_grey" } }, { sprites: s }) }
`;
  const at = (s: string, x: number, y: number, wall = false) => loadSource(PAL + STAGE + SM + `scene("a", { w: 40, h: 40 }, smoke(${s}, ${wall}))`, "t.px.js").image("a").get(x, y) >>> 24;
  const floor = at("[]", 20, 18), over = at('[{ name: "_puff", at: [0, 4], blend: "alpha" }]', 20, 18);
  assert.ok(over > floor && over < 0xff, `between the floor and white: ${over}`);
  assert.ok(at('[{ name: "_puff", at: [0, 4], blend: "add" }]', 20, 18) > over, "add: brighter still");
  assert.equal(at('[{ name: "_puff", at: [0, 4], blend: "alpha", opacity: 0 }]', 20, 18), floor, "opacity 0: nothing");
  assert.equal(at('[{ name: "_puff", at: [0, 5], blend: "alpha" }]', 20, 18, true), at("[]", 20, 18, true), "behind a wall: hidden");
  assert.equal(at('[{ name: "_puff", at: [0, 4], blend: "alpha" }]', 20, 21), floor, "no contact shadow under it");
  // the sun behind the slab: its shadow in front of its foot, with its holes when it dissolves
  const slab = (fx: string) => loadSource(PAL + STAGE + `sprite("_slab", { w: 20, h: 10, pivot: "bottom" }, rect(0, 0, 20, 10, "r"))
sprite("_slab_d", { base: "_slab" }${fx})
const F = model(); F.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, F.faces, { f: { tex: "_white" } }, { light: [-1, 1, 0.8], sun: "w", sky: { color: "w", strength: 0.2 }, sprites: [{ name: "_slab_d", at: [0, 4], shadow: 0 }] }))`, "t.px.js").image("a");
  const shaded = (img: { get(x: number, y: number): number }) => { let s = 0; for (let y = 20; y < 26; y++) for (let x = 10; x < 40; x++) if (img.get(x, y) >>> 24 < 200) s++; return s; };
  const whole = shaded(slab("")), holed = shaded(slab(', effect("dissolve", { progress: 0.5, scale: 2 })'));
  assert.ok(whole > 60 && holed < whole * 0.8, `its shadow lets the sun through its holes: ${holed} of ${whole} px still shaded`);
  const holes = slab(', effect("dissolve", { progress: 0.5, scale: 2 })');
  let floorSeen = 0;
  for (let y = 11; y < 20; y++) for (let x = 11; x < 29; x++) if (holes.get(x, y) >>> 24 !== 0xff || ((holes.get(x, y) >>> 16) & 255) > 60) floorSeen++;
  assert.ok(floorSeen > 10, "the floor behind seen through it");
});
