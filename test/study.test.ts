import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { encodeGif } from "../src/node/gif.ts";
import { decodeGif } from "../src/node/gifread.ts";
import { writePng } from "../src/node/output.ts";
import { main } from "../src/node/cli.ts";
import { areaDown, findGrid, lineFlaws, pixelate } from "../src/core/vision.ts";
import { latticeHash } from "../src/core/util.ts";
import { hueShifting, regionLines, spacingWords, study } from "../src/core/study.ts";
import { loadSource } from "../src/node/load.ts";
import { smearsOf } from "../src/core/decompose.ts";

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

test("study names near twins in a palette, once each, and not in a clean one", () => {
  const clean = drawing(40, 30), twin = drawing(40, 30);
  for (let x = 0; x < 40; x += 3) twin.set(x, 5, pack(34, 34, 52));                  // beside 30,30,46: one tone read
  for (let x = 1; x < 40; x += 3) twin.set(x, 9, (pack(34, 34, 52) & ~255) | 128);    // the same, half clear: no new pair
  const a = (img: Img) => study({ name: "t", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.doesNotMatch(a(clean), /Near twins/);
  assert.match(a(twin), /Near twins: 1 pair of colors .*: #1e1e2e\/#222234\./);
});

test("study reads a 1 px line's flaws: L-corners where it steps, a jaggy where its runs go out of order; pxl's curve and wire have neither", () => {
  const ink = pack(30, 20, 40), paper = pack(240, 230, 210);
  const page = (w: number, h: number) => { const img = new Img(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.set(x, y, paper); return img; };
  // a shallow line from its runs, one row each
  const runs = (r: number[]) => { const img = page(r.reduce((s, v) => s + v, 2), r.length + 2); let x = 1; r.forEach((n, y) => { for (let i = 0; i < n; i++) img.set(x++, y + 1, ink); }); return img; };
  assert.deepEqual(lineFlaws(runs([1, 2, 2, 1, 5, 2, 1, 2, 1])).jaggies, [[7, 5], [6, 4]], "the 5 in a falling trend, the 1 before it");
  assert.deepEqual(lineFlaws(runs([1, 1, 2, 3, 2, 4, 6, 8])).jaggies, [[8, 5]], "a dip in a rising curve");
  assert.equal(lineFlaws(runs([1, 1, 2, 2, 4, 2, 2, 1, 1])).jaggies.length, 0, "grows and shrinks steadily: an S");
  assert.equal(lineFlaws(runs([2, 3, 2, 3, 2, 3, 2, 3])).jaggies.length, 0, "a straight slope");
  // a 1:1 diagonal with one pixel doubled beside it
  const diag = page(18, 18);
  for (let i = 0; i < 16; i++) diag.set(i + 1, i + 1, ink);
  diag.set(7, 8, ink);
  assert.deepEqual(lineFlaws(diag).corners, [[7, 8]]);
  // a diagonal drawn 4-connected: every step doubled
  const stairs = page(32, 24);
  for (let i = 0; i < 20; i++) { stairs.set(4 + i, 2 + i, ink); stairs.set(5 + i, 2 + i, ink); }
  assert.match(study({ name: "t", frames: [stairs], ms: [100], kind: "test" }).text.join("\n"), /Lines \(dark, 1 px wide: 40 px\): drawn square, 19 L-corners \(at 1x: 5,2; 6,3;/);
  const p = loadSource('use("pico8"); pal({ k: 0, w: 7 })\nsprite("s", { w: 40, h: 24 }, rect(0, 0, 40, 24, "w"), curve([1, 22, 8, 6, 20, 2, 38, 1], "k"), wire(2, 4, 38, 10, 9, "k"))', "t.px.js");
  const own = lineFlaws(p.image("s"));
  assert.ok(own.line > 60, `${own.line} px of line`);
  assert.deepEqual([own.corners, own.jaggies], [[], []]);
});

test("spacing: a bounce slowing to the top, held, speeding down; a move back first and past the rest; a squash keeping its area", () => {
  const at = (ys: number[], xs?: number[], ws?: number[], hs?: number[]) => ys.map((y, f) => [f, (xs?.[f] ?? 40) - (ws?.[f] ?? 8) / 2, y - (hs?.[f] ?? 8) / 2, ws?.[f] ?? 8, hs?.[f] ?? 8] as [number, number, number, number, number]);
  assert.equal(spacingWords(at([40, 32, 26, 22, 20, 20, 22, 26, 32, 40])), "spacing, px a frame: up 8 6 4 2, slowing; holds 1; down 2 4 6 8, speeding up");
  // a punch: back 2, out 4 8 8, past its rest by 3 and back
  assert.match(spacingWords(at([9, 9, 9, 9, 9, 9, 9], [20, 18, 22, 30, 38, 41, 38]))!, /left 2; right 4 8 8 3, easing in and out; left 3: a move back first \(anticipation\)/);
  assert.match(spacingWords(at([9, 9, 9, 9, 9, 9], [20, 30, 40, 50, 53, 50]))!, /past its rest and back \(overshoot\)/);
  assert.match(spacingWords(at([30, 30, 30, 30], undefined, [8, 12, 8, 6], [8, 5, 8, 11]))!, /squash and stretch: 6-12 wide as 11-5 tall, the area within \d+%/);
  assert.equal(spacingWords(at([9, 9, 10])), null, "too short");
});

test("hue shifting counted ramp by ramp: warmer lights from shades(), one hue, a cold light", () => {
  const P = (src: string) => loadSource(src + '; sprite("t", "abc")', "t.px.js").image("t").data;
  const ramp = (cs: Uint32Array) => ({ colors: [...cs], counts: [1, 1, 1], neutral: false });
  const warm = P('shades("abc", "#5aa040")'), red = P('shades("abc", "#c04040")'), flat = P('shades("abc", "#4060c0", { hue: 0 })');
  const cold = P('shades("abc", "#c08040", { hue: -30 })');
  assert.equal(hueShifting([ramp(warm), ramp(red), ramp(flat), ramp(cold)]), "Hue shifting, of 4 colored ramps: 2 warmer in the light and cooler in the shade (what shades() makes), 1 cooler in the light (a cold light: the moon, metal; shades() with a negative hue), 1 one hue from dark to light (value only: Saint11's dull and muddy).");
  assert.equal(hueShifting([ramp(warm)]), null, "one ramp says nothing");
});

test("study --px: the size given is used, its offset found", () => {
  // drawn at 6x from 3,2: found by itself; told 6, the same; told 3 (a harmonic), read at 3
  const img = new Img(40 * 6 + 3, 30 * 6 + 2), d = drawing(40, 30);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) img.set(x, y, d.get(Math.max(0, Math.floor((x - 3) / 6)), Math.max(0, Math.floor((y - 2) / 6))));
  assert.deepEqual(findGrid(img, 6), { sx: 6, sy: 6, ox: 3, oy: 2 });
  assert.match(study({ name: "t", frames: [img], ms: [100], kind: "test" }, { px: 3 }).text.join("\n"), /drawn at 3x/);
});

test("study: a clip on twos, its drawings each held 200 ms, loops like any other", () => {
  // a box stepping right and back over 3 drawings, each shown 2 frames of 100 ms
  const back = drawing(48, 32, 7), ink = pack(240, 240, 240);
  const pose = (x: number) => { const img = back.copy(); for (let y = 10; y < 18; y++) for (let i = 0; i < 8; i++) img.set(x + i, y, ink); return img; };
  const frames = [10, 10, 14, 14, 18, 18, 14, 14].map(pose);
  const t = study({ name: "twos", frames, ms: frames.map(() => 100), kind: "test" }).text.join("\n");
  assert.match(t, /4 drawings held 200 ms each \(on twos\)/);
  assert.match(t, /Loop: the last frame runs into the first/);
});

test("study --at: the region's mover followed frame by frame by what differs from its usual look, eased in", () => {
  // a 4x4 box over a textured ground, slow in then fast: 1 1 1 5 6 px a frame
  const back = drawing(60, 12, 3), ink = pack(250, 250, 250), xs = [2, 3, 4, 5, 10, 16];
  const frames = xs.map((x) => { const img = back.copy(); for (let y = 4; y < 8; y++) for (let i = 0; i < 4; i++) img.set(x + i, y, ink); return img; });
  const lines = regionLines(frames).join("\n");
  assert.match(lines, /0: 2,4 4x4; 1: 3,4 4x4/);
  assert.match(lines, /spacing, px a frame: right 1 1 1 5 6, speeding up/);
});

test("study: a cycle whose second half is its first flipped (Saint11's top-down walk): draw half", () => {
  const bg = pack(40, 50, 60), ink = pack(240, 200, 120), dk = pack(120, 60, 40);
  // an asymmetric figure (an eye on one side, a leg and an arm forward), then the same three flipped
  const draw = (legL: number, legR: number, flip: boolean) => {
    const img = new Img(40, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 40; x++) img.set(x, y, bg);
    const put = (x: number, y: number, c: number) => img.set(flip ? 39 - x : x, y, c);
    for (let y = 6; y < 20; y++) for (let x = 15; x < 24; x++) put(x, y, ink);
    put(16, 8, dk); put(17, 8, dk);
    for (let y = 20; y < 20 + legL; y++) { put(16, y, dk); put(17, y, dk); }
    for (let y = 20; y < 20 + legR; y++) { put(21, y, dk); put(22, y, dk); }
    for (let x = 24; x < 24 + legL; x++) put(x, 12, ink);
    return img;
  };
  const one = [draw(8, 4, false), draw(6, 6, false), draw(4, 8, false), draw(8, 4, true), draw(6, 6, true), draw(4, 8, true)], frames = [...one, ...one];
  assert.match(study({ name: "walk", frames, ms: frames.map(() => 100), kind: "test" }).text.join("\n"), /the second half of its cycle is the first flipped \(flip: "x"\): draw 3 frames/);
});

test("study --at: an effect played once, dark, white, a blast fading to nothing, then empty", () => {
  const back = drawing(40, 40, 9), disc = (img: Img, r: number, c: number) => { for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (Math.hypot(x - 20, y - 20) <= r) img.set(x, y, c); return img; };
  const dark = pack(20, 10, 30), white = pack(255, 255, 255), fire = pack(250, 140, 40), smoke = pack(90, 60, 110);
  const frames = [back.copy(), disc(back.copy(), 5, dark), disc(back.copy(), 6, white), disc(back.copy(), 9, fire), disc(back.copy(), 7, smoke), disc(back.copy(), 4, smoke), disc(back.copy(), 2, smoke), back.copy(), back.copy()];
  assert.match(regionLines(frames).join("\n"), /Played once, an effect: it shows at frame 1, flashes near-white at 2, is biggest at 3, and fades over 3 frames to nothing by 7, then 2 empty/);
});

test("study: a ball crossing one way at 8 px a frame is carried, not a plane, and doesn't loop", () => {
  const ball = (flat: boolean) => Array.from({ length: 12 }, (_, f) => {
    const img = new Img(120, 40), bx = 6 + 8 * f;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 120; x++) img.set(x, y, flat ? pack(40, 44, 60) : (x * 7 + y * 13) % 17 < 3 ? pack(70, 90, 60) : (x + y) % 9 === 0 ? pack(50, 70, 40) : pack(110, 140, 90));
    for (let y = 16; y < 22; y++) for (let x = bx; x < bx + 6; x++) if (Math.hypot(x - bx - 2.5, y - 18.5) < 3.2) img.set(x, y, pack(230, 60, 60));
    return img;
  });
  for (const flat of [false, true]) {
    const frames = ball(flat), t = study({ name: "ball", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
    assert.match(t, /going right at 8\.00 px\/frame: one drawing carried along a path/, flat ? "on a flat ground" : "on a textured one");
    assert.doesNotMatch(t, /Planes going by/);
    assert.match(t, /Loop: the last frame jumps to the first \(across 94 px, where a usual step spans 14\)/);
  }
});

test("study follows a dash through its leap: 4 px a frame, two strides of 30, then 4 again", () => {
  const xs = [10, 14, 18, 22, 52, 82, 86, 90, 94, 98, 102, 106], bg = pack(40, 50, 60), dk = pack(120, 60, 40), ink = pack(240, 200, 120);
  const frames = xs.map((x) => { const img = new Img(160, 40); for (let y = 0; y < 40; y++) for (let i = 0; i < 160; i++) img.set(i, y, (i * 7 + y * 3) % 11 === 0 ? dk : bg); for (let y = 14; y < 26; y++) for (let i = 0; i < 10; i++) img.set(x + i, y, ink); return img; });
  const t = study({ name: "dash", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  assert.match(t, /in 12 of 12 frames, 1 drawing, going right .*carried along a path/);
  assert.match(t, /spacing, px a frame: right 4 4 4 30 30 4 4 4 4 4 4/);
});

test("study: smeared leaps over a dotted floor aren't a plane going by, nor a loop that closes", () => {
  // a slime at rest (one frame, as a GIF keeps a hold), three leaps with a smear from where it was, a stop
  const xs = [6, 30, 54, 70, 72], bg = pack(44, 42, 58), dot = pack(61, 58, 82), cream = pack(255, 246, 224), green = pack(140, 207, 99), ink = pack(27, 22, 48);
  const frames = xs.map((x, f) => {
    const img = new Img(96, 24), prev = f ? xs[f - 1] : x;
    for (let y = 0; y < 24; y++) for (let i = 0; i < 96; i++) img.set(i, y, (i * 7 + y * 3) % 11 === 0 ? dot : bg);
    if (x - prev > 8) for (let y = 10; y < 16; y++) for (let i = prev; i < x; i++) img.set(i, y, cream);
    for (let y = 9; y < 16; y++) for (let i = x; i < x + 12; i++) img.set(i, y, i === x || i === x + 11 || y === 9 || y === 15 ? ink : green);
    return img;
  });
  const t = study({ name: "leaps", frames, ms: [800, 100, 100, 100, 100], kind: "test" }).text.join("\n");
  assert.doesNotMatch(t, /Planes going by/);
  assert.match(t, /Loop: the last frame jumps to the first \(back \d+ px against the way every step went\)/);
  // and it is one thing carried through its smears, all five frames, the smears out of its box
  assert.match(t, /#1 \S+ at 6,9, in 5 of 5 frames, .*carried along a path.*Smears on frames 1-3/);
  assert.match(t, /spacing, px a frame: right 24 24 16 2/);
});

test("study follows a ball rolling at an uneven speed and hopping as one thing", () => {
  // Saint11's parallax card: a small ball rolls right, 0 to 4 px a frame, hops once in an arc
  const n = 34, dxs = Array.from({ length: n }, (_, f) => (f ? [1, 4, 0, 2][f % 4] : 0)), xs = dxs.map((_, f) => 2 + dxs.slice(0, f + 1).reduce((a, b) => a + b, 0));
  const ys = Array.from({ length: n }, (_, f) => [18, 14, 11, 9, 8, 8, 9, 11, 14][f - 12] ?? 18);
  const frames = xs.map((x, f) => {
    const img = new Img(90, 30), y = ys[f];
    for (let yy = 0; yy < 30; yy++) for (let xx = 0; xx < 90; xx++) img.set(xx, yy, (xx * 5 + yy * 3) % 13 < 2 ? pack(30, 90, 160) : pack(40, 120, 200));
    for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + 6; xx++) { const r = Math.hypot(xx - x - 2.5, yy - y - 2.5); if (r < 3.2) img.set(xx, yy, r > 2.2 ? pack(40, 20, 30) : pack(220, 50, 50)); }
    return img;
  });
  const t = study({ name: "ball", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  assert.match(t, /#1 \S+ at 2,8, in 34 of 34 frames, 1 drawing, going right .*carried along a path/);
  assert.doesNotMatch(t, /#2 /);
});

test("study follows a dash that crouches first: its middle shifting back under a pixel isn't going back", () => {
  // Saint11's squash card: standing, crouching (narrower and lower, its middle half a pixel back),
  // stretched along the dash, braking low, standing again
  const poses: [number, number, number, number][] = [[10, 4, 10, 24], [10, 4, 10, 24], [10, 4, 10, 24], [10, 4, 10, 24], [9, 8, 11, 20], [9, 10, 11, 18], [40, 14, 26, 12], [68, 14, 26, 12], [92, 15, 24, 11], [104, 16, 14, 12], [108, 16, 14, 12], [110, 12, 12, 16], [112, 6, 10, 22], [112, 4, 10, 24]];
  const bg = pack(30, 70, 140), dk = pack(50, 90, 160), body = pack(240, 120, 40), ink = pack(30, 20, 20);
  const frames = poses.map(([x, y, w, h]) => {
    const img = new Img(140, 32);
    for (let yy = 0; yy < 32; yy++) for (let xx = 0; xx < 140; xx++) img.set(xx, yy, (xx * 5 + yy * 3) % 13 < 2 ? dk : bg);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) img.set(xx, yy, xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1 ? ink : body);
    return img;
  });
  const t = study({ name: "crouch", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  assert.match(t, /#1 \S+ at 9,4, in 14 of 14 frames, .*going right .*carried along a path/);
  assert.doesNotMatch(t, /#2 /);
});

test("study follows a thing at rest most of the clip, then leaping: the place it left isn't a light", () => {
  // at rest 7 frames of 12 (the background has it there), on a flat ground and on a dotted one
  for (const dots of [false, true]) {
    const xs = [10, 10, 10, 10, 10, 10, 10, 40, 70, 100, 119, 119], bg = pack(40, 50, 60), dk = pack(120, 60, 40), ink = pack(240, 200, 120);
    const frames = xs.map((x) => { const img = new Img(160, 40); for (let y = 0; y < 40; y++) for (let i = 0; i < 160; i++) img.set(i, y, dots && (i * 7 + y * 3) % 11 === 0 ? dk : bg); for (let y = 14; y < 26; y++) for (let i = 0; i < 10; i++) img.set(x + i, y, ink); return img; });
    const t = study({ name: "rest", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
    assert.match(t, /#1 119x12 at 10,14, in 12 of 12 frames, 1 drawing, going right .*carried along a path/);
    assert.match(t, /spacing, px a frame: holds 6; right 30 30 30 19/);
    assert.doesNotMatch(t, /#2 /);
  }
});

test("study follows a ball through its smear: the streak isn't in its box or its spacing", () => {
  // 3 px a frame, then 20 on two frames with its lightest color swept from where it was, then 3 again
  const xs = [6, 9, 12, 15, 35, 55, 58, 61, 64, 67, 70, 73], bg = pack(40, 50, 60), dk = pack(120, 60, 40), ink = pack(20, 20, 30), red = pack(220, 70, 60), lite = pack(250, 170, 150);
  const frames = xs.map((x, f) => {
    const img = new Img(100, 30), prev = f ? xs[f - 1] : x;
    for (let y = 0; y < 30; y++) for (let i = 0; i < 100; i++) img.set(i, y, (i * 7 + y * 3) % 11 ? bg : dk);
    if (x - prev > 8) for (let y = 13; y < 19; y++) for (let i = prev + 4; i < x; i++) img.set(i, y, lite);
    for (let y = 11; y < 19; y++) for (let i = x; i < x + 8; i++) { const dx = i - x - 3.5, dy = y - 14.5, r = Math.hypot(dx, dy); if (r < 4.3) img.set(i, y, r > 3.2 ? ink : dx < -1 && dy < -1 ? lite : red); }
    return img;
  });
  const t = study({ name: "smeared", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  assert.match(t, /#1 75x8 at 6,11, in 12 of 12 frames, 1 drawing, going right .*Smears on frames 4-5 \(#faaa96.*stamp\(name, x, y, \{ smear/);
  assert.match(t, /spacing, px a frame: right 3 3 3 20 20 3 3 3 3 3 3/);
  assert.doesNotMatch(t, /#2 /);
});

test("study: an explosion played once over a ground is an effect, not an attack", () => {
  const ground = (x: number, y: number) => ((x * 7 + y * 13) % 17 < 3 ? pack(70, 90, 60) : (x + y) % 9 === 0 ? pack(50, 70, 40) : pack(110, 140, 90));
  // nothing, a dark disc, a white one, an orange blast growing, smoke thinning to nothing, then empty
  const R = [0, 5, 6, 9, 10, 8, 6, 4, 2, 0, 0, 0, 0, 0], C = [0, pack(20, 10, 30), pack(255, 255, 255), pack(250, 140, 40), pack(250, 120, 40), pack(120, 90, 130), pack(100, 80, 110), pack(90, 70, 100), pack(80, 70, 90)];
  const frames = R.map((r, f) => {
    const img = new Img(60, 50);
    for (let y = 0; y < 50; y++) for (let x = 0; x < 60; x++) img.set(x, y, ground(x, y));
    if (r) for (let y = 0; y < 50; y++) for (let x = 0; x < 60; x++) if (Math.hypot(x - 30, y - 25) <= r && ((x + y + f) % 3 !== 0 || f < 4)) img.set(x, y, C[Math.min(f, C.length - 1)]);
    return img;
  });
  const t = study({ name: "boom", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  assert.match(t, /#1 19x19 at 21,16, in 8 of 14 frames, .*: changing all over without repeating, or paint that comes and goes/);
  assert.doesNotMatch(t, /an attack/);
});

test("a smear in the body's own white is told by its shape: thin, there two frames", () => {
  // a body with a white highlight, and a white crescent beside it on frames 4 and 5
  const W = 40, H = 30, white = pack(250, 250, 250), body = pack(120, 80, 60), ground = pack(40, 50, 60);
  const F = Array.from({ length: 10 }, (_, t) => {
    const img = new Img(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img.set(x, y, ground);
    for (let y = 10; y < 22; y++) for (let x = 8; x < 14; x++) img.set(x, y, body);
    for (let y = 12; y < 15; y++) for (let x = 9; x < 13; x++) img.set(x, y, white);   // its highlight: 12 px of white each frame, so the smear's white isn't a color of its own
    if (t === 4 || t === 5) for (let a = -70; a <= 70; a += 4) { const r = 12, x = Math.round(11 + r * Math.cos((a * Math.PI) / 180)), y = Math.round(16 + r * Math.sin((a * Math.PI) / 180)); img.set(x, y, white); img.set(x + 1, y, white); }
    return img;
  });
  const fg = F.map((f) => Uint8Array.from(f.data, (c, i) => (c !== F[0].data[i] || (i % W >= 8 && i % W < 14 && Math.floor(i / W) >= 10 && Math.floor(i / W) < 22) ? 1 : 0)));
  assert.deepEqual(smearsOf(F, { x0: 0, y0: 0, x1: W - 1, y1: H - 1 }, W, fg).smears?.frames, [4, 5]);
});

test("pixelate keeps an edge where a box average blurs it", () => {
  // black and white, the edge off the 4 px grid: superpixels follow it, boxes average across it
  const img = new Img(200, 100);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) img.set(x, y, x < 101 ? pack(0, 0, 0) : pack(255, 255, 255));
  const grey = (o: Img) => [...o.data].filter((c) => c !== pack(0, 0, 0) && c !== pack(255, 255, 255)).length;
  assert.equal(grey(pixelate(img, 50, 25)), 0);
  assert.ok(grey(areaDown(img, 50, 25)) > 0);
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

test("study cuts each piece out of its background: a body that stays between its moving arms, a bird circling over a patch", () => {
  // 24 frames on a dithered lawn: a figure waving both arms (its body, outlined, never moves); a bird
  // going twice round a small loop over a yellow patch that doesn't reach the edge of its box
  const W = 120, H = 80, n = 24, g1 = pack(70, 140, 70), g2 = pack(90, 170, 80), soil = pack(120, 90, 50), ink = pack(20, 20, 30), red = pack(220, 60, 60), sun = pack(240, 220, 80);
  const lawn = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lawn.set(x, y, latticeHash(x, y) < 0.1 ? soil : (x + y) % 2 ? g1 : g2);
  for (let y = 18; y < 23; y++) for (let x = 88; x < 93; x++) lawn.set(x, y, sun);
  const frames = Array.from({ length: n }, (_, f) => {
    const img = lawn.copy();
    for (let y = 28; y < 42; y++) for (let x = 40; x < 48; x++) img.set(x, y, x === 40 || x === 47 || y === 28 || y === 41 ? ink : red);
    const up = f % 4 >= 3;
    for (const x of [37, 48]) for (let y = up ? 24 : 32; y < (up ? 31 : 39); y++) for (let dx = 0; dx < 3; dx++) img.set(x + dx, y, dx === 1 ? red : ink);
    const a = (f * 4 * Math.PI) / n, bx = 89 + Math.round(3 * Math.cos(a)), by = 19 + Math.round(3 * Math.sin(a));
    for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) img.set(bx + x, by + y, ink);
    return img;
  });
  const r = study({ name: "matte", frames, ms: frames.map(() => 100), kind: "test" });
  const json = r.pieces!.json as { pieces: { box: number[]; round?: boolean; strip: { frames: number; w: number; h: number } }[] };
  const at = (x: number, y: number) => json.pieces.findIndex((p) => p.box[0] <= x && x < p.box[0] + p.box[2] && p.box[1] <= y && y < p.box[1] + p.box[3]);
  const counts = (i: number) => {
    const s = r.pieces!.strips[i], { frames: k, w } = json.pieces[i].strip;
    return Array.from({ length: k }, (_, j) => { const c = new Map<number, number>(); for (let y = 0; y < s.h; y++) for (let x = j * w; x < (j + 1) * w; x++) { const v = s.get(x, y); if ((v & 255) >= 128) c.set(v, (c.get(v) ?? 0) + 1); } return c; });
  };
  // the figure: all of its body kept in every frame (6x12 red inside the outline, and the arms'), no lawn
  const fig = at(38, 34);
  assert.ok(fig >= 0, JSON.stringify(json.pieces.map((p) => p.box)));
  for (const c of counts(fig)) {
    assert.ok((c.get(red) ?? 0) >= 72, `body kept: ${c.get(red)}`);
    assert.equal((c.get(g1) ?? 0) + (c.get(g2) ?? 0) + (c.get(soil) ?? 0), 0, "no lawn");
  }
  // the bird: going round; only the bird in each frame, not the patch it flies over
  const bird = at(89, 17);
  assert.ok(bird >= 0 && json.pieces[bird].round, JSON.stringify(json.pieces));
  for (const c of counts(bird)) {
    assert.ok((c.get(ink) ?? 0) >= 4, `bird kept: ${c.get(ink)}`);
    assert.equal(c.get(sun) ?? 0, 0, "no patch");
  }
});

test("study tells the light apart before looking for things: a lamp pulsing on a floor, a pale blob bobbing on a dark sky", () => {
  // 16 frames: a warm lamp at 30,56 brightening and dimming a dithered floor round it; a flat pale blob
  // (no outline, so its edges change as softly as a light) bobbing a pixel up and down on a flat sky
  const W = 120, H = 80, n = 16, sky = pack(30, 34, 70), pale = pack(220, 230, 250), f1 = pack(70, 60, 50), f2 = pack(90, 80, 64);
  const frames = Array.from({ length: n }, (_, f) => {
    const img = new Img(W, H), k = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (y < 40) { img.set(x, y, sky); continue; }
      const c = (x + y) % 2 ? f1 : f2, d = Math.hypot(x - 30, y - 56), g = 1 + 0.9 * k * Math.max(0, 1 - d / 16);
      img.set(x, y, pack(Math.min(255, Math.round(((c >>> 24) & 255) * g)), Math.min(255, Math.round(((c >>> 16) & 255) * g * 0.9)), Math.min(255, Math.round(((c >>> 8) & 255) * g * 0.6))));
    }
    const dy = f % 4 < 2 ? 0 : 1;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) if (Math.hypot(x - 4.5, y - 5.5) < 5.5) img.set(80 + x, 14 + y + dy, pale);
    return img;
  });
  const r = study({ name: "relight", frames, ms: frames.map(() => 100), kind: "test" }), text = r.text.join("\n");
  const pieces = (r.pieces!.json as { pieces: { kind: string; box: number[]; source?: number[]; tint?: string }[] }).pieces;
  assert.match(text, /Light: where only the light changes/);
  const lamp = pieces.find((p) => p.source);
  assert.ok(lamp && Math.hypot(lamp.source![0] - 30, lamp.source![1] - 56) <= 8, JSON.stringify(pieces));
  assert.ok(parseInt(lamp!.tint!.slice(1, 3), 16) > parseInt(lamp!.tint!.slice(5, 7), 16), `warm: ${lamp!.tint}`);
  const blob = pieces.find((p) => p.box[0] <= 84 && p.box[0] + p.box[2] >= 86 && p.box[1] <= 20 && p.box[1] + p.box[3] >= 22);
  assert.ok(blob && blob.kind !== "light", JSON.stringify(pieces));
});

test("study follows two things through where they cross, each by its own speed", () => {
  // 48 frames: a red box going right 2 px a frame and a blue one going left, crossing in the middle
  const W = 120, H = 60, n = 48, back = drawing(W, H, 5), ink = pack(20, 20, 20);
  const box = (img: Img, x0: number, y0: number, c: number) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) img.set(x0 + x, y0 + y, x === 0 || y === 0 || x === 7 || y === 7 ? ink : c); };
  const frames = Array.from({ length: n }, (_, f) => { const img = back.copy(); box(img, 104 - 2 * f, 26, pack(60, 90, 220)); box(img, 8 + 2 * f, 24, pack(220, 60, 60)); return img; });
  const r = study({ name: "cross", frames, ms: frames.map(() => 100), kind: "test" });
  const going = (r.pieces!.json as { pieces: { kind: string; speed?: number[]; track: number[][] }[] }).pieces.filter((p) => p.speed);
  const right = going.find((p) => p.speed![0] > 1.5), left = going.find((p) => p.speed![0] < -1.5);
  assert.ok(right && left, JSON.stringify(going.map((p) => [p.speed, p.track.length])));
  assert.ok(right!.track.length >= 40 && left!.track.length >= 40, `${right!.track.length} ${left!.track.length}`);
});

test("study takes an editor's transparency checker for clear, and tells a reflection under the sprite", () => {
  // a 64x64 sprite on Aseprite's checker (two greys in 8 px squares), its reflection below it at 30%
  const W = 64, H = 64, g1 = pack(72, 70, 77), g2 = pack(84, 81, 89), ink = pack(10, 10, 14), blue = pack(30, 100, 200), skin = pack(220, 160, 110);
  const chk = (x: number, y: number) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? g2 : g1);
  const img = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img.set(x, y, chk(x, y));
  const sprite = (x: number, y: number) => (y < 6 ? (Math.abs(x - 31.5) < 3.5 ? skin : null) : Math.abs(x - 31.5) < 6 ? (Math.abs(x - 31.5) >= 5 || y === 29 ? ink : blue) : null);
  for (let y = 4; y < 30; y++) for (let x = 20; x < 44; x++) { const c = sprite(x, y - 4); if (c !== null) img.set(x, y, c); }
  const mix = (a: number, b: number, k: number) => pack(...([24, 16, 8].map((s) => Math.round(((a >>> s) & 255) * (1 - k) + ((b >>> s) & 255) * k)) as [number, number, number]));
  for (let y = 30; y < 56; y++) for (let x = 20; x < 44; x++) { const c = sprite(x, 59 - y - 4); if (c !== null) img.set(x, y, mix(chk(x, y), c, 0.3)); }
  const text = study({ name: "checker", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.match(text, /Clear: the transparency checker \(#484[0-9a-f]{3} and #54515[0-9a-f] in 8 px squares/);
  assert.match(text, /Reflection: below row 30, .* at about 30%/);
  // the checker's greys and the reflection's blends aren't read as the picture's colors
  assert.doesNotMatch(text.split("PALETTE AND RAMPS")[1].split("TECHNIQUES")[0], /#48464d|#545159/);
});

test("study reads an attack: poses played once, in place, with a smear on the frames the blade sweeps", () => {
  // 16 frames on clear: a body that dips a pixel as it swings an axe through 200 degrees once (or stands
  // still while its arm swings it: the arm keeps its shoulder, so it isn't carried); a cream crescent
  // swept on 3 of them
  for (const dips of [true, false]) {
  const W = 96, H = 72, n = 16, ink = pack(15, 15, 20), robe = pack(40, 80, 170), steel = pack(150, 160, 175), wood = pack(120, 80, 40), cream = pack(255, 250, 228);
  const frames = Array.from({ length: n }, (_, f) => {
    const img = new Img(W, H), dip = dips && f >= 4 && f <= 12 ? 1 : 0;
    for (let y = 30; y < 58; y++) for (let x = 34; x < 46; x++) img.set(x, y + dip, x === 34 || x === 45 || y === 30 || y === 57 ? ink : (x + y) % 3 ? robe : pack(30, 60, 140));
    const a = (-100 + (f * 200) / n) * (Math.PI / 180), cx = 47, cy = 40 + dip;
    for (let r = 0; r < 18; r++) for (const w of [-1, 0, 1]) img.set(Math.round(cx + Math.cos(a) * r - Math.sin(a) * w), Math.round(cy + Math.sin(a) * r + Math.cos(a) * w), w ? ink : wood);
    for (let r = 14; r < 20; r++) for (let w = 2; w < 7; w++) img.set(Math.round(cx + Math.cos(a) * r - Math.sin(a) * w), Math.round(cy + Math.sin(a) * r + Math.cos(a) * w), (r + w) % 2 ? steel : ink);
    if (f >= 7 && f <= 9) for (let d = -60; d <= 0; d += 2) { const b = a + (d * Math.PI) / 180; for (const r of [21, 22, 23]) img.set(Math.round(cx + Math.cos(b) * r), Math.round(cy + Math.sin(b) * r), cream); }
    return img;
  });
  const r = study({ name: "attack", frames, ms: frames.map(() => 90), kind: "test" }), text = r.text.join("\n");
  const pieces = (r.pieces!.json as { pieces: { kind: string; speed?: number[]; smears?: { frames: number[]; colors: string[] } }[] }).pieces;
  const attack = pieces.find((p) => p.kind === "action");
  assert.ok(attack, JSON.stringify(pieces.map((p) => p.kind)));
  assert.ok(!attack!.speed, "in place");
  assert.deepEqual(attack!.smears?.frames, [7, 8, 9]);
  assert.match(text, /Smears on frames 7-9 \(#fffae4/);
  }
});

test("study reads subpixel motion: a body breathing by half pixels through in-between tones, its feet still; looped, no attack", () => {
  // a pale body over dark legs on a flat ground: down a half pixel (its edges in the tone between it
  // and the ground), down a whole one, back a half, back; the legs never move
  const BG = pack(158, 78, 84), T = pack(240, 240, 240), M = pack(199, 159, 162), D = pack(24, 22, 34);
  const frame = (top: number, half: boolean) => {
    const img = new Img(40, 40);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) img.set(x, y, BG);
    for (let y = 30; y < 37; y++) for (const x of [16, 17, 22, 23]) img.set(x, y, D);
    for (let y = top; y < top + 9; y++) for (let x = 15; x < 24; x++) img.set(x, y, half && y === top ? M : T);
    if (half) for (let x = 15; x < 24; x++) img.set(x, top + 9, M);
    return img.scale(3);
  };
  const breath = [frame(18, false), frame(18, true), frame(19, false), frame(18, true)];
  const text = study({ name: "breath", frames: breath, ms: breath.map(() => 110), kind: "test" }).text.join("\n");
  assert.match(text, /Subpixel: \d+% of what changes/);
  assert.doesNotMatch(text, /Steps are whole pixels/);
  assert.doesNotMatch(text, /played once/);
  // the same breath in whole pixels: no subpixel to tell
  const bob = [frame(18, false), frame(19, false), frame(18, false), frame(19, false)];
  assert.doesNotMatch(study({ name: "bob", frames: bob, ms: bob.map(() => 110), kind: "test" }).text.join("\n"), /Subpixel/);
});

test("study reads back what stamp's sub draws: the subpixel idle of examples/subpixel.px.js, and not its single-pixel bob", () => {
  const p = loadSource(readFileSync(join(import.meta.dirname, "../examples/subpixel.px.js"), "utf8"), "subpixel.px.js");
  const frames = p.frames("subpixel").map((f) => f.img);
  const text = study({ name: "subpixel", frames, ms: frames.map(() => 111), kind: "test" }).text.join("\n");
  assert.match(text, /Subpixel: \d+% of what changes/);
  assert.match(text, /stamp\(part, x, y \+ 0\.5, \{ sub: \[dx, dy\] \}\)/);
  // the keeper moving by half pixels (right) is moving by part of a pixel; the one bobbing (left) isn't
  const pieces = text.split("\n").filter((l) => /^ {2}#\d/.test(l));
  assert.ok(pieces.some((l) => / at 8\d,\d+,.*by part of a pixel/.test(l)), pieces.join("\n"));
  assert.ok(!pieces.some((l) => / at 2\d,\d+,.*by part of a pixel/.test(l)), pieces.join("\n"));
});
