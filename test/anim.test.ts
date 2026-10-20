import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure, keys, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { encodeGif } from "../src/node/gif.ts";
import { Img } from "../src/core/image.ts";
import { pack, TRANSPARENT } from "../src/core/color.ts";

const BLINK = `anim("blink", { fps: 4, w: 3, h: 1 }, rect(0, 0, 3, 1, "r"),
  frame(), frame(px(1, 0, "w")), frame({ hold: 2 }, px(1, 0, "g")))`;
const load = (body: string) => loadSource(PAL + BLINK + "\n" + body, "t.px.js");
const frameKeys = (p: ReturnType<typeof load>, name: string) => p.frames(name).map((f) => keys({ ...p, image: () => f.img } as never, name));

test("anim: frame() items are patches over the shared items, with durations", () => {
  const p = load("");
  const fr = p.frames("blink");
  assert.deepEqual(fr.map((f) => f.ms), [250, 250, 500]);
  assert.deepEqual(frameKeys(p, "blink"), ["rrr", "rwr", "rgr"]);
  assert.deepEqual(p.timeline("blink"), { loop: 1000, step: 250, durations: [250, 250, 500], once: false });
});

test("anim: procedural frames see c.frame / c.frames / c.phase", () => {
  const p = loadSource(PAL + `anim("dot", { frames: 4, fps: 10, w: 4, h: 1 }, (c) => c.px(Math.round(c.phase * c.frames), 0, "w"))`, "t.px.js");
  assert.deepEqual(frameKeys(p, "dot"), ["w...", ".w..", "..w.", "...w"]);
  assert.equal(p.timeline("dot")!.step, 100);
});

test("anim: dir pingpong / reverse plays the drawn frames in that order; exports draw each once", () => {
  const four = (dir: string) => loadSource(PAL + `anim("a", { fps: 10, w: 1, h: 1, dir: "${dir}" }, "r",
    frame(), frame(px(0, 0, "w")), frame(px(0, 0, "g")), frame(px(0, 0, "k")))
scene("s", { w: 1, h: 1 }, stamp("a", 0, 0, { frame: 2 }))`, "t.px.js");
  const p = four("pingpong");
  assert.deepEqual(frameKeys(p, "a"), ["r", "w", "g", "k", "g", "w"]);
  assert.deepEqual(p.drawn("a").map((f) => keys({ ...p, image: () => f.img } as never, "a")), ["r", "w", "g", "k"]);
  assert.equal(p.direction("a"), "pingpong");
  assert.equal(keys(p, "s"), "g", "frame: n counts drawn frames");
  const r = four("reverse");
  assert.deepEqual(frameKeys(r, "a"), ["k", "g", "w", "r"]);
  assert.equal(r.drawn("a").length, 4);
  // procedural anims see the drawn frame in c.frame
  const d = loadSource(PAL + `anim("d", { frames: 3, w: 3, h: 1, dir: "pingpong" }, (c) => c.px(c.frame, 0, "w"))`, "t.px.js");
  assert.deepEqual(frameKeys(d, "d"), ["w..", ".w.", "..w", ".w."]);
  assert.match(failure(PAL + `anim("x", { dir: "yoyo" }, "r")`, "x").message, /dir must be "forward", "reverse" or "pingpong"/);
});

test("anim: loops that don't line up are cut at 60s and the build line says why", () => {
  const p = loadSource(PAL + `anim("a", { fps: 6, frames: 4, w: 1, h: 1 }, (c) => c.px(0, 0, "w"))
anim("b", { fps: 4, frames: 2, w: 1, h: 1 }, (c) => c.px(0, 0, "r"))
scene("s", { w: 2, h: 1 }, stamp("a", 0, 0), stamp("b", 1, 0))
scene("ok", { w: 1, h: 1 }, stamp("b", 0, 0))`, "t.px.js");
  assert.equal(p.timeline("s")!.capped, true);
  assert.equal(p.timeline("ok")!.capped, undefined);
  const dir = mkdtempSync(join(tmpdir(), "pxl-"));
  try {
    const { lines } = writeOutputs(p, dir, { only: ["s"], preview: false });
    assert.match(lines[0], /loops don't line up, cut at 60s/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("silhouettes: the placement option, and recolor's \"*\" for hit-flash frames", () => {
  assert.equal(keys(loadSource(PAL + `sprite("d", ".rw"); scene("s", { w: 3, h: 1 }, stamp("d", 0, 0, { silhouette: "k" }))`, "t.px.js"), "s"), ".kk");
  const p = loadSource(PAL + `sprite("h", { pivot: "bottom" }, ".rw")
anim("hit", { base: "h" }, frame(), frame(recolor({ "*": "k", w: "g" })))`, "t.px.js");
  assert.deepEqual(frameKeys(p, "hit"), [".rw", ".kg"]);
});

test("anim: scenes that place anims animate; delay shifts, frame freezes", () => {
  const p = load(`scene("s", { w: 11, h: 1, bg: "k" }, stamp("blink", 0, 0), stamp("blink", 4, 0, { delay: 250 }), stamp("blink", 8, 0, { frame: 1 }))
scene("still", { w: 3, h: 1 }, stamp("blink", 0, 0, { frame: 2 }))`);
  assert.deepEqual(p.timeline("s"), { loop: 1000, step: 250 });
  assert.deepEqual(frameKeys(p, "s"), ["rrrkrwrkrwr", "rwrkrgrkrwr", "rgrkrgrkrwr", "rgrkrrrkrwr"]);
  assert.equal(p.timeline("still"), undefined, "a frozen frame doesn't animate the scene");
  assert.equal(keys(p, "still"), "rgr");
});

test("anim: loop false holds the last frame; anims combine to the lcm of their loops", () => {
  const p = loadSource(PAL + `anim("a", { fps: 10, loop: false, w: 1, h: 1 }, frame(px(0, 0, "r")), frame(px(0, 0, "w")))
anim("b", { fps: 10, w: 1, h: 1 }, frame(px(0, 0, "g")), frame(px(0, 0, "k")), frame(px(0, 0, "w")))
scene("s", { w: 2, h: 1 }, stamp("a", 0, 0), stamp("b", 1, 0))`, "t.px.js");
  assert.equal(keys({ ...p, image: () => p.image("a", 0, 5000) } as never, "a"), "w");
  assert.deepEqual(p.timeline("s"), { loop: 600, step: 100 });
});

test("anim: frame() is only for anims; options are validated", () => {
  assert.match(failure(PAL + 'sprite("s", { w: 2, h: 2 }, frame(px(0, 0, "r")))', "s").message, /only goes inside an anim/);
  assert.match(failure(PAL + 'anim("a", { w: 2, h: 2 }, frame({ msec: 3 }))').message, /unknown option 'msec'/);
  assert.match(failure(PAL + 'anim("a", { w: 2, h: 2, fsp: 3 })').message, /unknown option 'fsp'/);
});

test("anim: build writes a strip, Aseprite-style JSON, GIFs and animated sheets", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-anim-"));
  try {
    const p = load(`sheet("all", ["blink"])`);
    const r = writeOutputs(p, dir);
    assert.deepEqual(r.errors, []);
    const j = JSON.parse(readFileSync(join(dir, "anims", "blink.json"), "utf8"));
    assert.deepEqual(Object.values(j.frames).map((f: any) => f.duration), [250, 250, 500]);
    assert.deepEqual(j.meta.frameTags, [{ name: "blink", from: 0, to: 2, direction: "forward" }]);
    assert.ok(readFileSync(join(dir, "anims", "blink.gif")).subarray(0, 6).toString() === "GIF89a");
    assert.ok(readFileSync(join(dir, "_preview", "blink.gif")).length > 0);
    const s = JSON.parse(readFileSync(join(dir, "all.json"), "utf8"));
    assert.deepEqual(Object.keys(s.frames), ["blink_0", "blink_1", "blink_2"]);
    assert.equal(s.meta.frameTags[0].to, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gif: frames decode back to the same pixels and delays", () => {
  const a = new Img(5, 3), b = new Img(5, 3);
  a.fill(pack(255, 0, 0));
  b.fill(pack(0, 0, 255));
  a.data[0] = TRANSPARENT;
  b.data[7] = pack(255, 255, 255);
  const g = decodeGif(encodeGif([{ img: a, ms: 120 }, { img: a, ms: 80 }, { img: b, ms: 50 }]));
  assert.equal(g.frames.length, 2, "repeated frames merge");
  assert.deepEqual(g.frames.map((f) => f.delay), [20, 5]);
  assert.equal(g.frames[0].rgba[0], -1, "transparent pixel");
  assert.deepEqual(g.frames[0].rgba[1], 0xff0000);
  assert.deepEqual(g.frames[1].rgba[7], 0xffffff);
  assert.deepEqual(g.frames[1].rgba[8], 0x0000ff);
});

test("gif: a scene stores only what changed in each frame, and decodes back to every pixel", () => {
  const frames = [0, 1, 2, 3].map((k) => {
    const img = new Img(64, 32);
    img.fill(pack(40, 120, 60));
    for (let x = 0; x < 64; x++) img.data[10 * 64 + x] = pack(200, 200, 90);          // a still stripe
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) img.data[(20 + y) * 64 + 5 + k * 9 + x] = pack(220, 40, 40);   // a moving dot
    return { img, ms: 100 };
  });
  const buf = encodeGif(frames), g = decodeGif(buf);
  assert.equal(g.frames.length, 4);
  for (let k = 0; k < 4; k++) assert.deepEqual(g.frames[k].rgba, [...frames[k].img.data].map((c) => c >>> 8), `frame ${k}`);
  const rects = g.frames.map((f) => (f as unknown as { rect: number[] }).rect);
  assert.deepEqual(rects[0], [0, 0, 64, 32], "the first frame whole");
  assert.deepEqual(rects[1], [5, 20, 12, 3], "the next only where the dot was and is");
});

test("gif: many colors are reduced to one palette and still decode", () => {
  const img = new Img(40, 40);
  for (let i = 0; i < img.data.length; i++) img.data[i] = pack(i % 256, (i * 7) % 256, (i * 13) % 256);
  const g = decodeGif(encodeGif([{ img, ms: 100 }]));
  assert.equal(g.frames[0].rgba.length, 1600);
});

/** Minimal GIF decoder for the tests: global palette, full-frame images. */
function decodeGif(buf: Buffer) {
  assert.equal(buf.subarray(0, 6).toString(), "GIF89a");
  const w = buf.readUInt16LE(6), h = buf.readUInt16LE(8), flags = buf[10];
  let p = 13;
  const gct: number[] = [];
  if (flags & 0x80) for (let i = 0; i < 2 << (flags & 7); i++, p += 3) gct.push((buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2]);
  const frames: { delay: number; rgba: number[] }[] = [];
  let delay = 0, trans = -1, dispose = 0, canvas: number[] = new Array(w * h).fill(-1), lastDispose = 0;
  while (buf[p] !== 0x3b) {
    if (buf[p] === 0x21) {
      const label = buf[p + 1];
      p += 2;
      if (label === 0xf9) { delay = buf.readUInt16LE(p + 2); trans = buf[p + 1] & 1 ? buf[p + 4] : -1; dispose = (buf[p + 1] >> 2) & 7; }
      while (buf[p]) p += buf[p] + 1;
      p++;
    } else if (buf[p] === 0x2c) {
      const fx = buf.readUInt16LE(p + 1), fy = buf.readUInt16LE(p + 3), fw = buf.readUInt16LE(p + 5), fh = buf.readUInt16LE(p + 7);
      p += 10;
      const min = buf[p++];
      const data: number[] = [];
      while (buf[p]) { for (let i = 1; i <= buf[p]; i++) data.push(buf[p + i]); p += buf[p] + 1; }
      p++;
      if (lastDispose === 2) canvas = new Array(w * h).fill(-1);
      const idx = unlzw(data, min, fw * fh);
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const i = idx[y * fw + x];
        if (i !== trans) canvas[(y + fy) * w + x + fx] = gct[i];
        else if (dispose === 2) canvas[(y + fy) * w + x + fx] = -1;
      }
      frames.push({ delay, rgba: [...canvas], rect: [fx, fy, fw, fh] } as { delay: number; rgba: number[] });
      lastDispose = dispose;
    } else throw new Error("bad block " + buf[p]);
  }
  return { w, h, frames };
}

function unlzw(data: number[], min: number, n: number): number[] {
  const clear = 1 << min, eoi = clear + 1, out: number[] = [];
  let size = min + 1, dict: number[][] = [], prev: number[] | undefined, bit = 0;
  const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[eoi] = []; size = min + 1; prev = undefined; };
  reset();
  while (out.length < n) {
    let code = 0;
    for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
    if (code === clear) { reset(); continue; }
    if (code === eoi) break;
    const entry = code < dict.length ? dict[code] : [...prev!, prev![0]];
    out.push(...entry);
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length === 1 << size && size < 12) size++;
  }
  return out;
}

test("gif: big noisy frames survive LZW table resets exactly", () => {
  const img = new Img(200, 150);
  let s = 7;
  for (let i = 0; i < img.data.length; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    img.data[i] = pack((s >>> 16) % 16 * 16, 0, 0);
  }
  const g = decodeGif(encodeGif([{ img, ms: 100 }]));
  for (let i = 0; i < img.data.length; i++) assert.equal(g.frames[0].rgba[i], img.data[i] >>> 8);
});

test("builds at times other than 0 are kept up to a budget of bytes, the least recently used out first", () => {
  // 200 frames of a scene with an anim in it: each frame builds the scene and the anim at that time;
  // a 2x2 scene frame is ~16 bytes of image and ~100 with its layers and placements, so 2000 bytes
  // keep the last dozen or so
  const src = PAL + `anim("blink", { w: 1, h: 1, frames: 200, fps: 10 }, (c) => c.px(0, 0, c.frame % 2 ? "r" : "w"))
scene("s", { w: 2, h: 2 }, stamp("blink", 0, 0))`;
  const p = loadSource(src, "t.px.js", { timedBytes: 2000 });
  const shown = p.frames("s");
  assert.equal(shown.length, 200);
  assert.notEqual(shown[1].img.data[0], shown[0].img.data[0], "the frames still differ");
  const held = p as unknown as { cache: Map<string, unknown>; timed: Map<string, unknown>; timedBytes: number };
  assert.ok(held.timedBytes <= 2000 && held.timed.size < 100 && held.cache.size <= 4, `${held.cache.size} + ${held.timed.size} builds, ${held.timedBytes} bytes`);
  // with the default budget the same frames all stay
  const all = loadSource(src, "t.px.js");
  all.frames("s");
  assert.ok((all as unknown as { timed: Map<string, unknown> }).timed.size >= 300);
});

test("preview GIFs with every: one frame in n, each lasting n times as long; the out/ GIF keeps them all", () => {
  const p = loadSource(PAL + `anim("blink", { w: 2, h: 2, frames: 6, fps: 10 }, (c) => c.rect(0, 0, 2, 2, c.frame % 2 ? "r" : "w"))`, "t.px.js");
  const dir = mkdtempSync(join(tmpdir(), "pxl-"));
  try {
    writeOutputs(p, dir, { every: 3 });
    const pv = decodeGif(readFileSync(join(dir, "_preview", "blink.gif"))), all = decodeGif(readFileSync(join(dir, "anims", "blink.gif")));
    assert.equal(pv.frames.length, 2);
    assert.equal(all.frames.length, 6);
    assert.equal(pv.frames.reduce((s, f) => s + f.delay, 0), all.frames.reduce((s, f) => s + f.delay, 0), "the loop lasts as long");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scroll: a strip that wraps goes by a whole number of its widths in the loop; anything else is refused", () => {
  const strip = `sprite("s", { w: 4, h: 1, wrap: "x" }, "rwgk")\n`;
  const p = load(strip + `anim("go", { w: 6, h: 1, frames: 4, fps: 4 }, scroll("s", 0, 4))`);
  assert.deepEqual(frameKeys(p, "go"), ["rwgkrw", "wgkrwg", "gkrwgk", "krwgkr"]);
  assert.match(failure(PAL + strip + `anim("go", { w: 6, h: 1, frames: 4 }, scroll("s", 0, 6))`, "go").message, /whole number of 4s/);
});

test("clouds: cut flat at the base row, lit on top; empty slots hold none", () => {
  const sky = (o: string) => `anim("sky", { w: 60, h: 20, frames: 4, fps: 4 }, rect(0, 0, 60, 20, "g"), clouds({ y: 15, gap: 20, w: 14, h: 8, n: 3, seed: 2, keys: "wrk"${o} }))`;
  const rows = frameKeys(load(sky("")), "sky")[1].split("\n");
  assert.match(rows[15], /k/, "the base on its row");
  assert.ok(rows.slice(16).every((r) => /^g+$/.test(r)), "nothing below it");
  assert.ok(rows.slice(0, 15).some((r) => r.includes("w")), "a lit top");
  assert.ok(frameKeys(load(sky(", empty: [0, 1, 2]")), "sky").every((f) => /^[g\n]+$/.test(f)), "no cloud in empty slots");
});

test("plume: puffs born before the loop starts are there on its first frame, and they move", () => {
  const p = load(`anim("smoke", { w: 30, h: 24, frames: 8, fps: 8 }, rect(0, 0, 30, 24, "g"), plume(10, 20, "wrk", { every: 2, life: 8, rise: 10, wind: 1, size: [2, 4] }))`);
  const fr = frameKeys(p, "smoke");
  assert.match(fr[0], /[wrk]/);
  assert.notEqual(fr[0], fr[1]);
});

test("clocked ops in a scene animated by what it places draw its first frame on its loop, as functions do", () => {
  const smoke = `plume(10, 20, "wrk", { every: 2, life: 8, rise: 10, size: [2, 4] })`, tick = `anim("tick", { w: 1, h: 1, frames: 12, fps: 12 }, (c) => c.px(0, 0, c.frame % 2 ? "r" : "w"))\n`;
  const p = load(tick + `scene("s", { w: 30, h: 24, bg: "g" }, stamp("tick", 0, 0), ${smoke})
anim("a", { w: 30, h: 24, frames: 12, fps: 12 }, rect(0, 0, 30, 24, "g"), stamp("tick", 0, 0), ${smoke})`);
  assert.equal(frameKeys(p, "s")[0], frameKeys(p, "a")[0]);
});

test("clouds: a negative gap drifts them leftward; placements refuse options they don't take", () => {
  const p = load(`anim("sky", { w: 60, h: 12, frames: 4, fps: 4 }, rect(0, 0, 60, 12, "g"), clouds({ y: 9, gap: -20, w: 10, h: 5, n: 1, keys: "wrk" }))`);
  const [a, b] = frameKeys(p, "sky").map((f) => f.split("\n")[9]);
  assert.equal(b.slice(0, 55), a.slice(5, 60), "five px left a frame");
  assert.match(failure(PAL + `sprite("x", "r")\nsprite("s", { w: 4, h: 4 }, stamp("x", 0, 0, { rlip: "x" }))`, "s").message, /rlip/);
});
