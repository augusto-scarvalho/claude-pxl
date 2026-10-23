import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { encodeGif } from "../src/node/gif.ts";
import { decodeGif } from "../src/node/gifread.ts";
import { writePng } from "../src/node/output.ts";
import { decodePng } from "../src/node/png.ts";
import { findGrid, lineFlaws } from "../src/core/vision.ts";
import { latticeHash } from "../src/core/util.ts";
import { hueShifting, regionLines, spacingWords, study } from "../src/core/study.ts";
import { loadSource } from "../src/node/load.ts";
import { smearsOf } from "../src/core/decompose.ts";
import { drawing, said } from "./helpers.ts";

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

test("study: an HD-2D diorama looks down through a long lens: its horizon above the picture, not uprights meeting there", () => {
  // frame 0 of examples/hd2d/harbor.px.js (tilted down 22°, fov 30) and graveyard.px.js (38°, fov 30) at
  // 1x (`pxl shot <file> <scene> --scale 1`). Seen from high up, the lines along the ground run steep and
  // meet above the picture: read as uprights, they said "three-point, tilted up". The harbor's are few
  // (a sloping awning's meet above the horizon), so its tilt reads high.
  const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
  for (const [name, lo, hi] of [["harbor", 18, 34], ["graveyard", 33, 43]] as const) {
    const img = decodePng(readFileSync(join(fixtures, `hd2d_${name}_1x.png`)));
    const text = study({ name, frames: [img], ms: [100], kind: "test" }).text.join("\n"), persp = text.slice(text.indexOf("PERSPECTIVE"));
    const m = /Looking down: the horizon above the picture at row -\d+.* 30° -> ~(\d+)°/.exec(text);
    assert.ok(m && +m[1] >= lo && +m[1] <= hi, persp);
    assert.doesNotMatch(text, /tilted up|Three-point/, name);
    assert.match(text, /pitch: -\d+, fov: 30/);
  }
  // uprights meeting just above the middle and a level point just below it: a lens of ~160° is no camera's
  const W = 320, H = 180, img = new Img(W, H), ink = pack(230, 220, 160);
  img.fill(pack(40, 44, 60));
  const draw = (x0: number, y0: number, vx: number, vy: number, t1: number) => { for (let t = 0; t <= t1; t += 0.002) { const x = Math.round(x0 + (vx - x0) * t), y = Math.round(y0 + (vy - y0) * t); if (img.inside(x, y)) { img.set(x, y, ink); if (img.inside(x + 1, y)) img.set(x + 1, y, ink); } } };
  for (const x0 of [60, 110, 150, 190, 230, 270]) draw(x0, 179, 160, -30, 0.6);
  for (const y0 of [0, 30, 150, 179]) draw(319, y0, 20, 100, 0.7);
  for (const y0 of [10, 170]) draw(0, y0, 20, 100, 0.5);
  const wide = study({ name: "wide", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.doesNotMatch(wide, /Three-point/, wide.slice(wide.indexOf("PERSPECTIVE")));
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
  // a disc darker at its rim but lit from straight above (a sprite that mirrors): not pillow shading
  const above = new Img(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5);
    if (d < 13) above.set(x, y, ramp[Math.max(0, Math.min(3, Math.floor((0.55 * (1 - d / 13) + 0.45 * (0.5 - (y - 15.5) / 26)) * 4.4)))]);
  }
  const c = study({ name: "above", frames: [above], ms: [100], kind: "test" }).text.join("\n");
  assert.match(c, /Lit from straight above: .* the edges facing up lighter than those facing down/);
  assert.doesNotMatch(c, /Pillow shading/);
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

test("study: a camera going forward opens out from a point in view; one off the picture is something else", () => {
  // a pixel texture zoomed 4% a frame about the picture's middle, and about a point above it (what a
  // scroll or things falling or rising together fit): only the first is a camera going forward
  const W = 160, H = 96, tex = drawing(64, 64, 3);
  const zoom = ([px, py]: number[], still = H) => {
    const frames = Array.from({ length: 12 }, (_, f) => {
      const img = new Img(W, H), s = (y: number) => 1.04 ** (y < still ? f : 0), m = (v: number) => ((Math.floor(v) % 64) + 64) % 64;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img.set(x, y, tex.get(m(px + (x - px) / s(y)), m(py + (y - py) / s(y))));
      return img;
    });
    return study({ name: "t", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  };
  assert.match(zoom([W / 2, H / 2]), /Camera: the scene opens out from 80,48/);
  assert.doesNotMatch(zoom([W / 2, -H]), /Camera:/);
  // opening out only above a point low in the picture, still under it: a waterfall's splash, not the
  // ground going by under a camera
  assert.doesNotMatch(zoom([W / 2, H - 12], H - 12), /Camera:/);
});
