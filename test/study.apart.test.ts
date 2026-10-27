// pxl study taking a picture or a clip apart (pieces, lights, sheets, normal maps, how a thing is
// built): in a file of its own beside study.test.ts, so the two run at once
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { writePng } from "../src/node/output.ts";
import { webpInfo } from "../src/node/media.ts";
import { areaDown, findRamps, pixelate } from "../src/core/vision.ts";
import { latticeHash } from "../src/core/util.ts";
import { study } from "../src/core/study.ts";
import { craft } from "../src/core/craft.ts";
import { loadSource } from "../src/node/load.ts";
import { loopInPlace } from "../src/core/decompose.ts";
import { PALETTE, drawing, said } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/study.apart.test.ts", ["examples/subpixel.px.js"]);

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

test("a WebP's chunks: an animated one's frame times, and whether its pixels are exact", () => {
  // RIFF....WEBP, then chunks: a fourcc, a little-endian size, the payload (padded to even)
  const chunk = (tag: string, body: number[]) => [...tag].map((c) => c.charCodeAt(0)).concat([body.length & 255, (body.length >> 8) & 255, 0, 0], body, body.length & 1 ? [0] : []);
  const riff = (chunks: number[][]) => { const body = [..."WEBP"].map((c) => c.charCodeAt(0)).concat(...chunks); return new Uint8Array([..."RIFF"].map((c) => c.charCodeAt(0)).concat([body.length & 255, (body.length >> 8) & 255, 0, 0], body)); };
  // an ANMF: x, y, w-1, h-1 (3 bytes each), the duration (3), flags (1), then the frame's own chunk
  const frame = (ms: number, inner: string) => chunk("ANMF", [0, 0, 0, 0, 0, 0, 9, 0, 0, 9, 0, 0, ms & 255, (ms >> 8) & 255, 0, 0, ...chunk(inner, [1, 2, 3])]);
  assert.deepEqual(webpInfo(riff([chunk("VP8X", new Array(10).fill(0)), chunk("ANIM", [0, 0, 0, 0, 0, 0]), frame(120, "VP8L"), frame(600, "VP8L")])), { ms: [120, 600], lossless: true });
  assert.deepEqual(webpInfo(riff([chunk("VP8 ", [1, 2, 3, 4])])), { ms: [], lossless: false });
  assert.equal(webpInfo(new Uint8Array([1, 2, 3])), null);
});

test("study: one cycle of a loop in place, the clip its whole cycle (an idle, a run on the spot), isn't an attack", () => {
  const B = pack(20, 20, 30), X = pack(200, 120, 60), Y = pack(90, 60, 40), w = 12, differ = (a: number, b: number) => a !== b;
  const box = (at: (x: number, y: number) => number) => Array.from({ length: w * 12 }, (_, i) => at(i % w, Math.floor(i / w)));
  const bar = (h: number) => box((x, y) => (x >= 4 && x < 8 && y >= 12 - h ? X : B));
  // there and back: heights 6 to 9 and down again
  assert.equal(loopInPlace([6, 7, 8, 9, 8, 7].map(bar), differ, w, [{ dx: 0, dy: 1 }]), "pingpong");
  // a run: the legs spread and gather, the near one (X) and the far one (Y) swapped half a cycle on
  const legs = (s: number, near: number, far: number) => box((x, y) => (y >= 6 && x === 5 - s ? near : y >= 6 && x === 6 + s ? far : y >= 2 && y < 6 && x >= 4 && x < 8 ? X : B));
  assert.equal(loopInPlace([0, 2, 4].map((s) => legs(s, X, Y)).concat([0, 2, 4].map((s) => legs(s, Y, X))), differ, w, [{ dx: 3, dy: 0 }]), "halves");
  // a breath: the body bobbing a pixel, not mirrored, nothing going more than a few px a frame, its
  // silhouette the same size; with a part flung far, not
  const bob = (dy: number) => box((x, y) => (x >= 4 && x < 8 && y >= 3 + dy && y < 9 + dy ? X : B));
  const breath = [0, 1, 1, 2, 1, 0].map(bob);
  assert.equal(loopInPlace(breath, differ, w, [{ dx: 0, dy: 1 }, { dx: 1, dy: 1 }]), "breath");
  assert.equal(loopInPlace(breath, differ, w, [{ dx: 0, dy: 9 }, { dx: 8, dy: 0 }]), null);
  // a swing: the same small moves, but a smear shows for two frames and the silhouette grows with it
  const swing = [0, 1, 1, 2, 1, 0].map(bob);
  for (const k of [2, 3]) swing[k] = swing[k].map((c, i) => (i % w < 4 && Math.floor(i / w) >= 3 ? Y : c));
  assert.equal(loopInPlace(swing, differ, w, [{ dx: 0, dy: 1 }, { dx: 1, dy: 1 }]), null);
  // the last frame jumping back to the first: not a loop
  assert.equal(loopInPlace([2, 3, 4, 5, 6, 12].map(bar), differ, w, [{ dx: 0, dy: 1 }]), null);
});

test("study: a ramp whose hue turns one way all along stays one ramp past 55°; two materials side by side don't join", () => {
  const hex = (h: string) => pack(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  // a sphere in SLYNYRD's five tones, red-brown in the shade to pale yellow in the light (81° of hue)
  const tones = ["#73342e", "#99592e", "#b3912d", "#c2cc52", "#f2f2aa"].map(hex), ball = new Img(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 15.5, dy = y - 15.5, r = Math.hypot(dx, dy);
    if (r < 14) ball.set(x, y, tones[Math.min(4, Math.floor(Math.max(0, (-0.6 * dx - 0.7 * dy) / 14 * 0.7 + Math.sqrt(1 - (r / 14) ** 2) * 0.45) * 5))]);
  }
  const ramps = findRamps(ball).filter((r) => r.colors.length > 1);
  assert.equal(ramps.length, 1, ramps.map((r) => r.colors.length).join(","));
  assert.equal(ramps[0].colors.length, new Set(ball.data.filter((c) => c)).size, "every tone the sphere uses in it");
  // grass and dirt in stripes: greens and browns of like lightness, touching all along, stay two ramps
  const grass = ["#2f5a2a", "#4c8a3c", "#78b84e"].map(hex), dirt = ["#4a3020", "#7a5530", "#a8804a"].map(hex), field = new Img(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) field.set(x, y, (x >> 2) % 2 ? grass[y % 3] : dirt[(y + 1) % 3]);
  assert.ok(findRamps(field).filter((r) => r.colors.length > 1).length >= 2);
});

test("study: planes that share rows (a far texture showing between a near one's blocks) are each found by their blocks' speed", () => {
  // the far plane a texture everywhere going 1 px a frame; the near one blocks of another texture,
  // 16 px of every 32, going 3 px a frame, in the same rows
  const NL = String.fromCharCode(10), W = 128, H = 64, P = [pack(40, 60, 90), pack(70, 100, 140), pack(120, 150, 190), pack(200, 120, 70), pack(240, 180, 110), pack(150, 80, 50)];
  const frames = Array.from({ length: 8 }, (_, t) => {
    const img = new Img(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = (x + 3 * t) % 256, bx = (x + t) % 256;
      img.set(x, y, fx % 32 < 16 ? P[3 + Math.floor(latticeHash(fx, y) * 3)] : P[Math.floor(latticeHash(bx + 999, y) * 3)]);
    }
    return img;
  });
  const text = study({ name: "planes", frames, ms: frames.map(() => 80), kind: "test" }).text.join(NL);
  const planes = text.split(NL).filter((l) => /Planes (going by|sharing rows)/.test(l)).join(NL);
  assert.match(planes, /1(\.00)? px\/frame left/, planes || text.slice(text.indexOf("MOTION"), text.indexOf("MOTION") + 800));
  assert.match(planes, /3(\.00)? px\/frame left/, planes);
});

test("study takes a sheet apart: its sprites by row, their sizes and colors; labels and boxes left out", () => {
  // two rows of four 10x14 sprites on clear, a label of three letters, a box drawn round nothing
  const img = new Img(160, 80), ink = pack(30, 20, 40), fill = pack(200, 120, 60), white = pack(250, 250, 250);
  for (const y0 of [4, 40]) for (let i = 0; i < 4; i++) for (let y = 0; y < 14; y++) for (let x = 0; x < 10; x++)
    img.set(4 + i * 20 + x, y0 + y, x === 0 || y === 0 || x === 9 || y === 13 ? ink : fill);
  for (let k = 0; k < 3; k++) for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if ((x + y + k) % 2 === 0 || y === 0) img.set(4 + k * 4 + x, 26 + y, white);
  for (let t = 0; t < 24; t++) for (const [x, y] of [[130 + t, 2], [130 + t, 25], [130, 2 + t], [153, 2 + t]]) img.set(x, y, white);
  const text = study({ name: "s", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.match(text, /8 sprites apart on clear, in 2 rows; 3 label marks \(text\) and 1 box drawn round frames left out/, text);
  assert.match(text, /Sizes \(their ink, w x h\): 8 of 10 x 14\. Height: median 14 px/);
  assert.match(text, /Rows, top down: 4, 4; in 2 of them the sprites are one size/);
  assert.match(text, /Spacing: 10 px between sprites in a row \(median\), 22 px between rows/);
  assert.match(text, /A sheet of sprites apart: no one view to read/);
});

test("study reads an isometric picture: lines rising and falling 2:1, parallel, none meeting", () => {
  const img = new Img(160, 100), line = pack(220, 210, 170);
  img.fill(pack(40, 50, 60));
  for (let c = -80; c < 180; c += 16) for (let x = 0; x < 160; x++) for (const y of [Math.floor(c + x / 2), Math.floor(c - x / 2)]) if (img.inside(x, y)) img.set(x, y, line);
  const text = study({ name: "i", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.match(text, /Isometric: lines rising and falling at 2\d\.\d° \(2:1/, text.slice(text.indexOf("PERSPECTIVE")));
  assert.match(text, /Isometric 2:1: build it with the iso blocks/);
});

test("study takes normal maps laid beside the art out, leaves one-hue masks and a ripper's two-color panels out of a sheet", () => {
  // eight sprites on white panels with teal between, a row of their masks (magenta fading to black at
  // the edge), and a block of normal maps (flat #8080ff, a dome's normals on each)
  const img = new Img(200, 150), teal = pack(0, 128, 128), white = pack(255, 255, 255);
  img.fill(teal);
  for (let y = 4; y < 56; y++) for (let x = 4; x < 196; x++) img.set(x, y, white);
  const ink = pack(40, 30, 50), fill = pack(210, 140, 80), skin = pack(240, 200, 160);
  for (let i = 0; i < 8; i++) for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) img.set(8 + i * 22 + x, 10 + y, x === 0 || x === 9 || y === 0 || y === 15 ? ink : y < 5 ? skin : fill);
  for (let i = 0; i < 8; i++) for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) img.set(8 + i * 22 + x, 34 + y, x === 0 || x === 9 ? pack(120, 0, 120) : pack(255, 0, 255));
  for (let y = 60; y < 150; y++) for (let x = 0; x < 200; x++) {
    const dx = ((x % 20) - 10) / 10, dy = ((y % 20) - 10) / 10, r2 = dx * dx + dy * dy, nz = Math.sqrt(Math.max(0, 1 - Math.min(1, r2)));
    const [nx, ny, z] = r2 < 0.8 ? [dx, -dy, nz] : [0, 0, 1], l = Math.hypot(nx, ny, z);
    img.set(x, y, pack(Math.round((nx / l * 0.5 + 0.5) * 255), Math.round((ny / l * 0.5 + 0.5) * 255), Math.round((z / l * 0.5 + 0.5) * 255)));
  }
  const text = study({ name: "n", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.match(text, /Normal maps: \d+% of the picture is normal maps/, text.slice(0, 600));
  // (the masks, and maybe a scrap the maps leave at a dome's rim)
  assert.match(text, /8 sprites apart on clear, in 1 row; (8|9) one-color silhouettes \(masks of where each sprite is\) left out/, text.slice(text.indexOf("SHEET")));
});

test("study reads a ripped sheet's cell fill as clear: magenta cells, black lines between, sprites touching them (3S's)", () => {
  // 4 x 3 cells of 25 x 41 magenta; in each a figure: a body 11 px wide, its feet across the whole cell on its bottom rows
  const img = new Img(105, 127), black = pack(0, 0, 0), magenta = pack(255, 0, 255), line = pack(16, 32, 96), fill = pack(48, 112, 208);
  img.fill(black);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x0 = 1 + c * 26, y0 = 1 + r * 42, body = (x: number, y: number) => y >= 37 || (y >= 12 && x >= 7 && x < 18);
    for (let y = 0; y < 41; y++) for (let x = 0; x < 25; x++) {
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !body(x + dx, y + dy) || x + dx < 0 || x + dx > 24 || y + dy > 40);
      img.set(x0 + x, y0 + y, !body(x, y) ? magenta : edge ? line : fill);
    }
  }
  const text = study({ name: "cells", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  assert.match(text, /Clear: #ff00ff fills the cells round the sprites \(a ripper's, #000000 between them\).*key: "#ff00ff"/, text.slice(0, 800));
  assert.match(text, /12 sprites apart on clear, in 3 rows/, text.slice(text.indexOf("SHEET")));
});

test("study tells how a thing is built: its tones, where its lights and darks sit, its hue's turn", async () => {
  // a ball 30 px across on clear, lit from the upper left in four tones from a blue shade to a yellow light
  const img = new Img(34, 34), T = [pack(40, 50, 90), pack(60, 110, 80), pack(120, 170, 70), pack(220, 220, 120)];
  for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) {
    const dx = (x - 16.5) / 15, dy = (y - 16.5) / 15;
    if (dx * dx + dy * dy <= 1) img.set(x, y, T[Math.max(0, Math.min(3, Math.round(1.6 - (1.6 * (dx + dy)) / 1.4)))]);
  }
  const c = craft(img, 0, 0, 33, 33, (k) => (k & 255) >= 128)!;
  assert.equal(c.tones, 4);
  assert.ok(c.light[0] < 0 && c.light[1] < 0, "its lights at its upper left");
  assert.ok(c.dark[0] > 0 && c.dark[1] > 0, "its darks at its lower right");
  assert.equal(c.warm, true, "shadows cool, lights toward yellow");
  const dir = mkdtempSync(join(tmpdir(), "pxl-craft-"));
  writePng(join(dir, "ball.png"), img);
  assert.match(await said("study", join(dir, "ball.png"), "--no-out"), /OBJECT \(how it is built\)\n  at \d+,\d+: \d+x\d+, 4 tones/);
});
