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
import { areaDown, findGrid, pixelate } from "../src/core/vision.ts";
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

test("study: two-point perspective, its lens and its turn, from lines meeting on one horizon either side", () => {
  // a camera turned 40° with a 90° lens: the world's z lines meet at 26,70 and its x lines at 351,70
  const W = 320, H = 180, img = new Img(W, H);
  img.fill(pack(40, 44, 60));
  const ink = pack(230, 220, 160);
  const draw = (x0: number, y0: number, vx: number, vy: number, t1: number) => { for (let t = 0; t <= t1; t += 0.002) { const x = Math.round(x0 + (vx - x0) * t), y = Math.round(y0 + (vy - y0) * t); if (img.inside(x, y)) { img.set(x, y, ink); if (img.inside(x, y + 1)) img.set(x, y + 1, ink); } } };
  for (const [x0, y0] of [[200, 179], [260, 179], [319, 160], [319, 120], [300, 179], [150, 179]]) draw(x0, y0, 26, 70, 0.7);
  for (const [x0, y0] of [[0, 179], [40, 179], [0, 130], [100, 179], [0, 100], [150, 179]]) draw(x0, y0, 351, 70, 0.7);
  const text = study({ name: "two", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  const m = /Two-point perspective: the horizon at row (\d+);.*\(fov ~(\d+)°\)/.exec(text), y = /yaw: (\d+)/.exec(text);
  assert.ok(m && y, text.slice(text.indexOf("PERSPECTIVE")));
  assert.ok(Math.abs(+m![1] - 70) <= 4 && Math.abs(+m![2] - 90) <= 8 && Math.abs(+y![1] - 40) <= 4, `${m![0]} ${y![0]}`);
});

test("study: a sprite's light read off its rim, pillow shading, banding", () => {
  // a disc shaded from the upper left: light on the rim from there, no pillow
  const lit = new Img(32, 32), rings = new Img(32, 32), ramp = [pack(30, 30, 60), pack(70, 70, 140), pack(120, 130, 210), pack(190, 200, 250)];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy);
    if (d >= 13) continue;
    const n = [dx / 13, dy / 13], l = Math.max(0, -0.6 * n[0] - 0.8 * n[1]);
    lit.set(x, y, ramp[Math.min(3, Math.floor(l * 3.2 + 0.4))]);
    rings.set(x, y, ramp[d < 4 ? 3 : d < 8 ? 2 : d < 11 ? 1 : 0]);                // concentric: pillow shaded
  }
  const a = study({ name: "lit", frames: [lit], ms: [100], kind: "test" }).text.join("\n");
  assert.match(a, /Light on the silhouette .*: from the upper left/);
  assert.doesNotMatch(a, /Pillow shading/);
  const b = study({ name: "rings", frames: [rings], ms: [100], kind: "test" }).text.join("\n");
  assert.match(b, /Pillow shading: lighter the farther in from the edge all round/);
  assert.doesNotMatch(b, /three-point/, "a disc's edges meet at its middle: not uprights");
  // a box shaded in stripes whose ends line up: banding
  const box = new Img(24, 16);
  for (let y = 2; y < 14; y++) for (let x = 4; x < 20; x++) box.set(x, y, ramp[Math.min(3, Math.floor((y - 2) / 3))]);
  assert.match(study({ name: "box", frames: [box], ms: [100], kind: "test" }).text.join("\n"), /Banding .*: [1-9]\d* pairs?/);
});

test("pixelate keeps an edge where a box average blurs it", () => {
  // black and white, the edge off the 4 px grid: superpixels follow it, boxes average across it
  const img = new Img(200, 100);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) img.set(x, y, x < 101 ? pack(0, 0, 0) : pack(255, 255, 255));
  const grey = (o: Img) => [...o.data].filter((c) => c !== pack(0, 0, 0) && c !== pack(255, 255, 255)).length;
  assert.equal(grey(pixelate(img, 50, 25)), 0);
  assert.ok(grey(areaDown(img, 50, 25)) > 0);
});

test("study reads pxl's own gallery back as it was made", async () => {
  // the train: four planes scrolled 320, 640, 1280 and 1920 px over its 192 frames
  const train = await said("study", "docs/gallery/parallax_train.gif", "--no-out");
  const speeds = [...train.matchAll(/at (\d+\.\d+) px\/frame left/g)].map((m) => +m[1]);
  for (const [i, v] of [320, 640, 1280, 1920].entries()) assert.ok(Math.abs(speeds[i] - v / 192) < 0.1, `plane ${i}: ${speeds[i]} for ${v / 192}`);
  assert.match(train, /No lines meet|no third point|parallel in the picture/);
  // the park: perspective({ horizon: 70, fov: 90, yaw: 40 })
  const park = await said("study", "docs/gallery/park.gif", "--no-out");
  const m = /Two-point perspective: the horizon at row (\d+);.*\(fov ~(\d+)°\)/.exec(park), y = /yaw: (\d+)/.exec(park);
  assert.ok(m && y, park);
  assert.ok(Math.abs(+m![1] - 70) <= 6 && Math.abs(+m![2] - 90) <= 8 && Math.abs(+y![1] - 40) <= 4, `${m![0]} ${y![0]}`);
});

test("study takes an animation apart: what is carried, what animates in place, a light that pulses, an effect", () => {
  // 32 frames on a still backdrop: a box carried right 2 px a frame; a 4-frame blinker in place; a
  // patch brightening and darkening all at once; a patch of noise that never repeats
  const W = 160, H = 90, n = 32, back = drawing(W, H, 3), ink = pack(250, 250, 250);
  const frames = Array.from({ length: n }, (_, f) => {
    const img = back.copy();
    for (let y = 10; y < 18; y++) for (let x = 0; x < 8; x++) img.set(10 + 2 * f + x, y, x === 0 || y === 10 ? pack(20, 20, 20) : pack(220, 60, 60));
    for (let y = 40; y < 48; y++) for (let x = 20; x < 28; x++) img.set(x, y, (x + y + Math.floor(f / 2)) % 4 === 0 ? ink : pack(30, 30, 90));
    const v = 120 + 60 * Math.round(Math.sin((f * Math.PI) / 4));
    for (let y = 40; y < 52; y++) for (let x = 70; x < 82; x++) img.set(x, y, pack(v, v, Math.round(v * 0.6)));
    for (let y = 60; y < 80; y++) for (let x = 110; x < 140; x++) img.set(x, y, latticeHash(x * 7 + f, y * 3 - f) < 0.5 ? pack(40, 120, 200) : pack(160, 210, 240));
    return img;
  });
  const r = study({ name: "pieces", frames, ms: frames.map(() => 100), kind: "test" }), text = r.text.join("\n");
  const piece = (x: number, y: number) => text.split("\n").find((l) => l.includes(` at ${x},${y},`));
  // the box carried is isolated and followed: its box in each of the 32 frames, 2 px on each time
  const carried = (r.pieces!.json as { pieces: { kind: string; track: number[][] }[] }).pieces.find((p) => p.kind === "carried")!;
  assert.equal(carried.track.length, 32);
  assert.ok(carried.track.every((e, i) => e[1] === 10 + 2 * i && e[3] === 8), JSON.stringify(carried.track.slice(0, 4)));
  assert.ok(r.pieces!.sheet.w > 0);
  assert.match(piece(10, 10) ?? text, /going right at 2\.00 px\/frame: one drawing carried along a path/);
  assert.match(piece(20, 40) ?? text, /animated in place: an anim of its drawings/);
  assert.match(piece(70, 40) ?? text, /lighter and darker all at once: a light/);
  assert.match(piece(110, 60) ?? text, /changing all over without repeating/);
});
