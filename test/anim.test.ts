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
  let delay = 0, trans = -1;
  while (buf[p] !== 0x3b) {
    if (buf[p] === 0x21) {
      const label = buf[p + 1];
      p += 2;
      if (label === 0xf9) { delay = buf.readUInt16LE(p + 2); trans = buf[p + 1] & 1 ? buf[p + 4] : -1; }
      while (buf[p]) p += buf[p] + 1;
      p++;
    } else if (buf[p] === 0x2c) {
      p += 10;
      const min = buf[p++];
      const data: number[] = [];
      while (buf[p]) { for (let i = 1; i <= buf[p]; i++) data.push(buf[p + i]); p += buf[p] + 1; }
      p++;
      const idx = unlzw(data, min, w * h);
      frames.push({ delay, rgba: idx.map((i) => (i === trans ? -1 : gct[i])) });
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

test("a long animated scene keeps a bounded number of frame builds", () => {
  // 200 frames of a scene with an anim in it: each frame builds the scene and the anim at that
  // time; the project keeps the builds at time 0 and only the latest timed ones
  const p = loadSource(PAL + `anim("blink", { w: 1, h: 1, frames: 200, fps: 10 }, (c) => c.px(0, 0, c.frame % 2 ? "r" : "w"))
scene("s", { w: 2, h: 2 }, stamp("blink", 0, 0))`, "t.px.js");
  const shown = p.frames("s");
  assert.equal(shown.length, 200);
  assert.notEqual(shown[1].img.data[0], shown[0].img.data[0], "the frames still differ");
  const held = p as unknown as { cache: Map<string, unknown>; timed: Map<string, unknown> };
  assert.ok(held.timed.size <= 64 && held.cache.size <= 4, `${held.cache.size} + ${held.timed.size} builds kept`);
});
