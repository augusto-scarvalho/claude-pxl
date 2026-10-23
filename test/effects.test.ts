// effect(): the CPU effects on assets. Each is checked for what the plan asks of every effect: zero
// strength changes nothing (RGBA), the same seed and frame give the same image (and seeking needs no
// history), alpha stays straight over a light and a dark ground, edges, a sheet, and the exported
// frames equal to what shot and the viewer show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { decodePng } from "../src/node/png.ts";
import { decodeGif } from "../src/node/gifread.ts";
import { shotFrame } from "../src/node/shot.ts";
import type { Img } from "../src/core/image.ts";

const PALS = 'use("pico8"); pal({ k: 0, r: 8, w: 7, g: 11, y: 10, o: 9, h: "#ff004d80" }); ';
// a sprite with a clear border, three colors, a lone pixel
const BODY = 'rect(2, 1, 12, 10, "g"), rect(4, 3, 4, 3, "r"), px(10, 5, "w")';
const load = (src: string) => loadSource(PALS + src, "t.px.js");
const sprite = (fx = "", body = BODY, size = "w: 16, h: 12") => load(`sprite("s", { ${size} }, ${body}${fx ? ", " + fx : ""})`).image("s");
const same = (a: Img, b: Img) => a.w === b.w && a.h === b.h && a.data.every((c, i) => c === b.data[i]);

test("effects: zero strength changes nothing, alpha included", () => {
  const base = sprite();
  for (const fx of ['effect("dissolve", { progress: 0, edge: "yo" })', 'effect("pixelate", { size: 1 })', 'effect("dither")',
    'effect("tint", { color: "y", amount: 0 })', 'effect("distort", { amount: 0 })', 'effect("distort", { amount: 0.4 })', 'effect("emit", { strength: 0 })'])
    assert.ok(same(sprite(fx), base), fx);
  // and on a pixel half clear: everything but dither (which makes alpha whole) leaves it be
  const soft = BODY + ', px(6, 9, "h")', b2 = sprite("", soft);
  for (const fx of ['effect("dissolve", { progress: 0 })', 'effect("tint", { color: "y", amount: 0 })', 'effect("emit", { strength: 0, pulse: 1 })'])
    assert.ok(same(sprite(fx, soft), b2), fx);
});

test("effects: the same seed and frame give the same image; another seed another; a frame needs no history", () => {
  const fx = 'effect("dissolve", { progress: 0.5, edge: "y", seed: 4 })';
  assert.ok(same(sprite(fx), sprite(fx)));
  assert.ok(!same(sprite(fx), sprite(fx.replace("seed: 4", "seed: 5"))));
  const anim = 'anim("a", { base: "s", frames: 8, fps: 8 }, effect("distort", { amount: 2, scale: 3, speed: 2 }))';
  const src = `sprite("s", { w: 16, h: 12 }, ${BODY})\n${anim}`;
  const all = load(src).frames("a");
  assert.equal(all.length, 8);
  assert.ok(!same(all[0].img, all[4].img), "the distortion moves with the clock");
  assert.ok(same(load(src).build("a", 0, 625).img, all[5].img), "frame 5 built alone is frame 5");
  const still = load(src.replace("speed: 2", "speed: 0")).frames("a");
  assert.ok(still.every((f) => same(f.img, still[0].img)), "speed 0 holds still");
});

test("effects: alpha stays straight; over a light and a dark ground only the part-clear pixels differ", () => {
  const soft = BODY + ', px(6, 9, "h")', before = sprite("", soft);
  const alphas = new Set([...before.data].map((c) => c & 255));
  const over = (img: Img, bg: number) => img.data.map((c) => { const a = (c & 255) / 255; return Math.round(((c >>> 24) & 255) * a + bg * (1 - a)); });
  for (const fx of ['effect("dissolve", { progress: 0.5, edge: "yo" })', 'effect("pixelate", { size: 2 })', 'effect("dither")',
    'effect("tint", { color: "w", amount: 0.5 })', 'effect("distort", { amount: 2, scale: 3 })', 'effect("emit", { strength: 0.8 })']) {
    const img = sprite(fx, soft);
    for (const c of img.data) {
      if ((c & 255) === 0) assert.equal(c, 0, `${fx}: a clear pixel is 0, not a color with no alpha`);
      assert.ok(alphas.has(c & 255) || (c & 255) === 255, `${fx}: alpha ${c & 255} came from nowhere`);
      if (fx.includes("dither")) assert.ok((c & 255) === 0 || (c & 255) === 255, "dither leaves no part-clear pixel");
    }
    const light = over(img, 236), dark = over(img, 26);
    img.data.forEach((c, i) => assert.equal(light[i] !== dark[i], (c & 255) < 255, `${fx}: pixel ${i} over light and dark`));
  }
  // straight, not premultiplied: the half-clear red goes halfway to white and keeps its alpha
  const t = sprite('effect("tint", { color: "w", amount: 0.5 })', soft).get(6, 9);
  assert.equal(t & 255, 0x80);
  assert.equal(t >>> 24, Math.round(0xff + (0xff - 0xff) * 0.5));
  assert.equal((t >>> 16) & 255, Math.round(0x00 + (0xf1 - 0x00) * 0.5));
});

test("effects: the edges: clear past them, the other side on a wrapped asset; cells cut by them", () => {
  const full = 'rect(0, 0, 12, 12, "g"), rect(3, 3, 6, 6, "r")', fx = 'effect("distort", { amount: 2, scale: 2 })';
  const cut = sprite(fx, full, "w: 12, h: 12");
  const clear = [...cut.data.keys()].filter((i) => cut.data[i] === 0).map((i) => [i % 12, Math.floor(i / 12)]);
  assert.ok(clear.length > 0, "pixels near the edge take the clear beyond it");
  assert.ok(clear.every(([x, y]) => x < 2 || y < 2 || x >= 10 || y >= 12 - 2), "and only there (amount 2)");
  assert.ok(!sprite(fx, full, "w: 12, h: 12, wrap: true").data.includes(0), "wrapped: the other side, nothing clear");
  // pixelate: a cell the edge cuts takes the most common of its pixels inside, not the clear outside
  assert.ok(!sprite('effect("pixelate", { size: 3 })', 'rect(0, 0, 7, 7, "g")', "w: 7, h: 7").data.includes(0));
});

test("effects: dissolve takes its share, rings only round its holes, in blocks of pixel", () => {
  const open = (fx: string) => sprite(fx, 'rect(0, 0, 64, 64, "g")', "w: 64, h: 64");
  const gone = (img: Img) => img.data.filter((c) => c === 0).length / img.data.length;
  for (const p of [0.25, 0.5, 0.75]) assert.ok(Math.abs(gone(open(`effect("dissolve", { progress: ${p}, scale: 4 })`)) - p) < 0.1, `progress ${p}`);
  assert.equal(gone(open('effect("dissolve", { progress: 1 })')), 1);
  const ringed = open('effect("dissolve", { progress: 0.3, scale: 4, edge: "yo" })'), Y = 0xffec27ff;
  assert.ok(ringed.data.includes(Y) && ringed.data.includes(0xffa300ff), "a yellow ring and an orange one");
  ringed.data.forEach((c, i) => {
    if (c !== Y) return;
    const x = i % 64, y = Math.floor(i / 64), at = (a: number, b: number) => (a < 0 || b < 0 || a >= 64 || b >= 64 ? 1 : ringed.data[b * 64 + a]);
    assert.ok([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes(0), `the first ring touches a hole at ${x},${y}`);
  });
  const blocks = open('effect("dissolve", { progress: 0.5, scale: 2, pixel: 2 })');
  for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) {
    const q = [blocks.get(x, y), blocks.get(x + 1, y), blocks.get(x, y + 1), blocks.get(x + 1, y + 1)].map((c) => c === 0);
    assert.ok(q.every((v) => v === q[0]), `block ${x},${y} goes whole`);
  }
});

test("effects: dither mixes the two nearest keys by how far the color lies; tint, emit and where / on", () => {
  const grey = sprite('effect("dither", { keys: "kw" })', 'rect(0, 0, 16, 16, "#808080")', "w: 16, h: 16");
  const W = grey.data.filter((c) => c === 0xfff1e8ff).length / 256;
  assert.ok(grey.data.every((c) => c === 0x000000ff || c === 0xfff1e8ff), "only the two keys");
  assert.ok(W > 0.4 && W < 0.75, `about half white, got ${W}`);
  // emit: own color brighter, past white into white; pulse 1 is gone halfway round the loop
  const lit = sprite('effect("emit", { on: "r", strength: 4 })');
  assert.equal(lit.get(4, 3), 0xffffffff, "a hot core whitens");
  assert.equal(lit.get(2, 1), sprite().get(2, 1), "on: only those keys");
  const pulse = load(`sprite("s", { w: 16, h: 12 }, ${BODY})\nanim("a", { base: "s", frames: 4, fps: 4 }, effect("emit", { strength: 1, pulse: 1 }))`).frames("a");
  assert.ok(!same(pulse[0].img, sprite()) && same(pulse[2].img, sprite()), "pulse: full at the start, none halfway");
  const half = sprite('effect("tint", { color: "y", amount: 1, where: [0, 0, 8, 12] })');
  assert.equal(half.get(4, 3), 0xffec27ff);
  assert.equal(half.get(10, 5), sprite().get(10, 5), "where: only inside");
  // ramp: the tint stays in the palette, or in those keys, each color to one
  const inPal = sprite('effect("tint", { color: "y", amount: 0.4, ramp: true })'), keyed = new Set(load('sprite("s", "g")').assets.get("s")!.pal.chosen());
  assert.ok(inPal.data.every((c) => c === 0 || keyed.has(c)) && !same(inPal, sprite()), "ramp: true, every color a palette color");
  assert.ok(sprite('effect("tint", { color: "y", amount: 0.6, ramp: "kwy" })').data.every((c) => [0, 0x000000ff, 0xfff1e8ff, 0xffec27ff].includes(c)), "ramp: those keys only");
  assert.ok(same(sprite('effect("tint", { color: "y", amount: 0, ramp: "kw" })'), sprite()), "amount 0 changes nothing, ramp or not");
  // in a layer it works on the layer's pixels only; in a clip, inside it
  const layered = load(`sprite("s", { w: 16, h: 12 }, ${BODY}, layer("top", {}, rect(0, 0, 4, 12, "w"), effect("dissolve", { progress: 1 })))`).image("s");
  assert.ok(same(layered, sprite()), "the layer's own pixels went, the art under it stayed");
  const clipped = sprite('clip([4, 3, 1, 1], effect("tint", { color: "y", amount: 1 }))'), plain = sprite();
  assert.deepEqual([...clipped.data.keys()].filter((i) => clipped.data[i] !== plain.data[i]), [3 * 16 + 4], "a clip: only inside it");
});

test("effects: traced in steps; options checked with the effect's name", () => {
  const p = loadSource(PALS + `sprite("s", { w: 16, h: 12 }, ${BODY}, effect("pixelate", { size: 2 }), (c) => c.effect("tint", { color: "y" }))`, "t.px.js", { trace: true });
  const labels = p.build("s").trace!.frames.map((f) => f.label);
  assert.ok(labels.includes('effect("pixelate", {size:2})'), labels.join(" | "));
  assert.ok(labels.some((l) => l.startsWith('effect("tint"')), "from a function too");
  const err = (fx: string) => failure(PALS + `sprite("s", { w: 4, h: 4 }, rect(0, 0, 4, 4, "g"), ${fx})`, "s").message;
  assert.match(err('effect("disolve")'), /no effect 'disolve' \(did you mean 'dissolve'\?\)/);
  assert.match(err('effect("dissolve", { progres: 0.5 })'), /effect "dissolve": unknown option 'progres' \(did you mean 'progress'\?\)/);
  assert.match(err('effect("dissolve", { progress: 2 })'), /progress is a number from 0 to 1, got 2/);
  assert.match(err('effect("tint")'), /effect "tint": color: give a color/);
  assert.match(err('effect("distort", { axis: "z" })'), /axis is "xy", "x", "y"/);
  assert.match(err('effect("dissolve", { edge: "@" })'), /unknown color key '@'/);
});

test("effects: a sheet and the exported strip and GIF are the frames shot shows", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-fx-"));
  try {
    const p = load(`sprite("s", { w: 16, h: 12 }, ${BODY})
anim("fade", { base: "s", frames: 6, fps: 6 }, (c) => c.effect("dissolve", { progress: c.phase, edge: "yo", scale: 3 }))
sheet("all", ["fade"], { pad: 1 })`);
    assert.deepEqual(writeOutputs(p, dir).errors, []);
    const drawn = p.drawn("fade"), strip = decodePng(readFileSync(join(dir, "anims", "fade.png")));
    const gif = decodeGif(readFileSync(join(dir, "anims", "fade.gif")));
    const sheet = decodePng(readFileSync(join(dir, "all.png"))), cells = JSON.parse(readFileSync(join(dir, "all.json"), "utf8")).frames;
    assert.equal(drawn.length, 6);
    drawn.forEach((f, i) => {
      const shot = shotFrame(p, "fade", i);
      assert.ok(same(shot, f.img), `frame ${i}: shot is the frame`);
      assert.ok(same(strip.sub(i * 16, 0, 16, 12), f.img), `frame ${i}: the strip`);
      assert.ok(same(gif.frames[i].img, f.img), `frame ${i}: the GIF`);
      const { x, y } = cells[`fade_${i}`].frame;
      assert.ok(same(sheet.sub(x, y, 16, 12), f.img), `frame ${i}: the sheet`);
    });
    assert.ok(!same(drawn[0].img, drawn[3].img));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sway: the foot stays, the top goes amount px downwind, the rows between by their height; normals go with their pixels", () => {
  const bar = (fx: string) => load(`sprite("t", { w: 9, h: 10, pivot: "bottom" }, rect(4, 0, 1, 10, "g"), bump("dome"))
anim("a", { base: "t", frames: 4 }, ${fx})`);
  const xs = (img: Img) => Array.from({ length: 10 }, (_, y) => [...Array(9).keys()].find((x) => img.get(x, y) !== 0));
  const p = bar('effect("sway", { amount: 3, lean: 1, power: 1, vary: 0 })'), f = p.frames("a");
  assert.deepEqual(xs(f[2].img), [7, 7, 6, 6, 6, 5, 5, 5, 4, 4], "3 px at the top, nothing at the foot");
  assert.deepEqual(xs(bar('effect("sway", { amount: -3, lean: 1, power: 1, vary: 0, still: 4 })').frames("a")[0].img), [1, 2, 2, 3, 3, 4, 4, 4, 4, 4], "to the left, the 4 rows over the foot still");
  const flat = p.image("t"), moved = f[2].img, n = (img: Img, x: number, y: number) => [...img.norm!.subarray(3 * (y * 9 + x), 3 * (y * 9 + x) + 3)];
  assert.deepEqual(n(moved, 7, 0), n(flat, 4, 0), "the top pixel's normal went with it");
  assert.ok(same(bar('effect("sway", { amount: 0 })').frames("a")[1].img, flat), "amount 0 changes nothing");
  // lean 0: to and fro about the upright; copies reseeded sway out of step
  const fro = bar('effect("sway", { amount: 3, lean: 0, power: 1, vary: 0 })').frames("a").map((g) => xs(g.img)[0]);
  assert.deepEqual(fro, [4, 7, 4, 1], "upright, right, upright, left over the loop");
  const two = load(`sprite("t", { w: 9, h: 10, pivot: "bottom" }, rect(4, 0, 1, 10, "g"))
anim("a", { base: "t", frames: 8 }, effect("sway", { amount: 3, vary: 1 }))
scene("s", { w: 18, h: 10 }, stamp("a", 4.5, 10, { reseed: true }), stamp("a", 13.5, 10, { reseed: true }))`).frames("s");
  assert.ok(two.some((g) => !same(g.img.sub(0, 0, 9, 10), g.img.sub(9, 0, 9, 10))), "each copy its own way");
});

test("sway in mesh(): a sprite's shadow on the floor sways with it; a sprite's delay is its own time in the loop", () => {
  const src = (delay: number) => `ramps("kgw")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }
sprite("_white", "w")
sprite("_pole", { w: 12, h: 20, pivot: "bottom" }, rect(5, 0, 2, 20, "r"))
anim("_pole_sway", { base: "_pole", frames: 4 }, effect("sway", { amount: 4, lean: 0, vary: 0 }))
const F = model(); F.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, F.faces, { f: { tex: "_white" } }, { light: [-1, 1, 0.8], sun: "w", sky: { color: "w", strength: 0.2 }, sprites: [{ name: "_pole_sway", at: [0, 4], shadow: 0, delay: ${delay} }] }))`;
  const f = load(src(0)).frames("a");
  assert.equal(f.length, 4);
  const changed = [...f[0].img.data.keys()].filter((i) => f[0].img.data[i] !== f[1].img.data[i]);
  assert.ok(changed.some((i) => Math.floor(i / 40) > 21), "floor pixels in front of its foot changed: the shadow moved");
  assert.ok(same(load(src(125)).frames("a")[0].img, f[1].img), "delayed a frame: its first frame is the other's second");
});
