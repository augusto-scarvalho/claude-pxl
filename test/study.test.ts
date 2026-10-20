import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { encodeGif } from "../src/node/gif.ts";
import { decodeGif } from "../src/node/gifread.ts";
import { writePng } from "../src/node/output.ts";
import { main } from "../src/node/cli.ts";
import { findGrid } from "../src/core/vision.ts";
import { latticeHash } from "../src/core/util.ts";
import { study } from "../src/core/study.ts";

// a 1x drawing in a handful of colors: runs of 1-3 px, a different length on each row, so no grid
const PALETTE = [pack(30, 30, 46), pack(60, 90, 150), pack(110, 160, 220), pack(200, 120, 60), pack(240, 220, 160), pack(70, 140, 70)];
const drawing = (w: number, h: number, seed = 1) => {
  const img = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.set(x, y, PALETTE[Math.floor(latticeHash(Math.floor(x / (1 + ((y * 7) % 3))) + seed * 101, y) * PALETTE.length)]);
  return img;
};
const said = async (...argv: string[]) => {
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { await main(argv); } finally { console.log = log; }
  return lines.join("\n");
};

test("gif decode: every frame as a viewer composites it, with its delay", () => {
  const a = drawing(13, 7), b = a.copy(), c = b.copy();
  b.set(2, 3, pack(9, 9, 9)); c.set(12, 6, pack(250, 1, 1));
  const g = decodeGif(encodeGif([{ img: a, ms: 120 }, { img: b, ms: 80 }, { img: c, ms: 50 }]));
  assert.deepEqual(g.frames.map((f) => f.ms), [120, 80, 50]);
  for (const [i, want] of [a, b, c].entries()) assert.deepEqual([...g.frames[i].img.data], [...want.data], `frame ${i}`);
});

test("study: the grid of an exact upscale, and of one blurred and scaled by a fraction", () => {
  const d = drawing(60, 40);
  assert.deepEqual(findGrid(d.scale(3)), { sx: 3, sy: 3, ox: 0, oy: 0 });
  assert.deepEqual(findGrid(d), { sx: 1, sy: 1, ox: 0, oy: 0 }, "at 1x, no grid");
  // 2.5x, each pixel the average of what it covers in a box a little wider than it (a blur)
  const W = 150, H = 100, blur = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (const [dx, dy] of [[0, 0], [-0.4, 0], [0.4, 0], [0, -0.4], [0, 0.4]]) {
      const c = d.get(Math.min(59, Math.max(0, Math.floor((x + 0.5 + dx) / 2.5))), Math.min(39, Math.max(0, Math.floor((y + 0.5 + dy) / 2.5))));
      r += (c >>> 24) & 255; g += (c >>> 16) & 255; b += (c >>> 8) & 255; n++;
    }
    blur.set(x, y, pack(Math.round(r / n), Math.round(g / n), Math.round(b / n)));
  }
  const gb = findGrid(blur);
  assert.ok(Math.abs(gb.sx - 2.5) < 0.05 && Math.abs(gb.sy - 2.5) < 0.05, JSON.stringify(gb));
});

test("study: pixel art read at 1x; planes going by at their own speeds; a loop that closes", () => {
  // three bands of texture going left at 1, 2 and 4 px a frame over 32 frames, drawn at 2x
  const W = 128, H = 48, n = 32, tex = drawing(W, H, 7);
  const frames = Array.from({ length: n }, (_, f) => {
    const img = new Img(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = y < 16 ? 1 : y < 32 ? 2 : 4; img.set(x, y, tex.get((x + v * f) % W, y)); }
    return img.scale(2);
  });
  const r = study({ name: "t", frames, ms: frames.map(() => 50), kind: "test" });
  const text = r.text.join("\n");
  assert.ok(r.pixelArt);
  assert.match(text, /drawn at 2x/);
  for (const v of ["1.00", "2.00", "4.00"]) assert.match(text, new RegExp(`at ${v} px/frame left`));
  assert.match(text, /a loop that closes/);
});

test("study: one-point perspective where lines meet; a photo is translated, not read as pixel art", () => {
  // edges running in from the picture's edges to 80,30
  const W = 160, H = 90, img = new Img(W, H);
  img.fill(pack(40, 44, 60));
  for (const [x0, y0] of [[0, 90], [20, 90], [50, 90], [110, 90], [140, 90], [160, 90], [0, 60], [160, 60], [0, 75], [160, 75]])
    for (let t = 0; t <= 1; t += 0.002) { const x = Math.round(x0 + (80 - x0) * t * 0.85), y = Math.round(y0 + (30 - y0) * t * 0.85); if (img.inside(x, y)) { img.set(x, y, pack(230, 220, 160)); if (img.inside(x + 1, y)) img.set(x + 1, y, pack(230, 220, 160)); } }
  const text = study({ name: "p", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  const m = /One-point perspective: the horizon at row (\d+), the camera looking at column (\d+)/.exec(text);
  assert.ok(m, text);
  assert.ok(Math.abs(+m![1] - 30) <= 3 && Math.abs(+m![2] - 80) <= 3, m![0]);
  // a smooth gradient with grain: no grid, thousands of colors
  const photo = new Img(320, 200);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) photo.set(x, y, pack(Math.round(60 + x * 0.5 + latticeHash(x, y) * 12), Math.round(80 + y * 0.6), Math.round(140 - x * 0.2 + latticeHash(y, x) * 10)));
  const r = study({ name: "q", frames: [photo], ms: [100], kind: "test" }, { colors: 12 });
  assert.equal(r.pixelArt, false);
  assert.deepEqual([r.picture.w, r.picture.h], [160, 100]);
  assert.ok(r.palette.length <= 12);
  assert.match(r.text.join("\n"), /not pixel art/);
});

test("cli study writes the sheet, the picture at 1x and the palette", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "ref.png");
  writePng(file, drawing(40, 30).scale(3));
  const text = await said("study", file, "--out", dir);
  assert.match(text, /^Kind: pixel art, drawn at 3x/m);
  for (const f of ["ref.png", "ref_1x.png", "ref.hex"]) assert.ok(existsSync(join(dir, "_study", f)), f);
});
