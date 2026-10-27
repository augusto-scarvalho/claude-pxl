import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure, PAL } from "./helpers.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { decodePng } from "../src/node/png.ts";
import { bump, edt, normalImage } from "../src/core/normals.ts";
import { Img } from "../src/core/image.ts";
import { rotate } from "../src/core/rotate.ts";
import { pack } from "../src/core/color.ts";
import type { BumpOpts } from "../src/core/model.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/normals.test.ts");

const load = (body: string) => loadSource(PAL + body, "t.px.js");
/** Normal x/y of a pixel as signs (-1, 0, 1); null when it has none. */
const dir = (p: ReturnType<typeof load>, name: string, x: number, y: number) => {
  const img = p.image(name), i = y * img.w + x, n = img.norm;
  if (!n || n[i * 3 + 2] === 0) return null;
  return [Math.sign(n[i * 3]), Math.sign(n[i * 3 + 1])];
};

test("bump: bevel slopes edges outward and leaves the top flat; dome peaks in the middle", () => {
  const p = load(`
sprite("b", { w: 8, h: 8 }, rect(0, 0, 8, 8, "w"), bump("bevel", { w: 2 }))
sprite("d", { w: 9, h: 9 }, circ(4, 4, 4, "w"), bump("dome"))`);
  assert.deepEqual(dir(p, "b", 0, 4), [-1, 0], "left edge faces left");
  assert.deepEqual(dir(p, "b", 4, 7), [0, 1], "bottom edge faces down");
  assert.deepEqual(dir(p, "b", 4, 4), [0, 0], "top is flat");
  assert.deepEqual(dir(p, "d", 4, 4), [0, 0]);
  assert.deepEqual(dir(p, "d", 8, 4), [1, 0]);
  assert.deepEqual(dir(p, "d", 4, 0), [0, -1]);
});

test("bump: `on` keys bevel each region separately", () => {
  const p = load(`sprite("s", { w: 9, h: 3 }, rect(0, 0, 9, 3, "r"), vline(4, 0, 3, "k"), bump("bevel", { on: "r", w: 1 }))`);
  assert.deepEqual(dir(p, "s", 3, 1), [1, 0], "brick edge next to the mortar faces it");
  assert.deepEqual(dir(p, "s", 5, 1), [-1, 0]);
  assert.equal(dir(p, "s", 4, 1), null, "mortar gets no normal");
});

test("normals: numpad grid; flips, rotations and mirroring turn the normals with the pixels", () => {
  const p = load(`
sprite("a", "rr", normals(0, 0, "69"))
sprite("fx", { base: "a", flip: "x" })
sprite("r90", { base: "a", rot: 90 })
sprite("m", { mx: true }, "r", normals(0, 0, "4"))`);
  assert.deepEqual(dir(p, "a", 0, 0), [1, 0]);
  assert.deepEqual(dir(p, "a", 1, 0), [1, -1]);
  assert.deepEqual(dir(p, "fx", 1, 0), [-1, 0]);
  assert.deepEqual(dir(p, "fx", 0, 0), [-1, -1]);
  assert.deepEqual(dir(p, "r90", 0, 0), [0, 1], "right turns to down");
  assert.deepEqual(dir(p, "m", 1, 0), [1, 0], "mirrored half faces the other way");
  assert.match(failure(PAL + 'sprite("x", "r", normals(0, 0, "Z"))', "x").message, /unknown direction 'Z'.*row 0, col 0/);
});

test("normals: any angle (resampled or sheared) turns them with the pixels; a scale keeps them, and the light given", () => {
  // all facing right and toward us (nx 90, nz 90) but the top row, which has none
  const img = new Img(12, 12).fill(pack(200, 60, 60)), n = img.normals();
  for (let i = 12; i < 144; i++) { n[i * 3] = 90; n[i * 3 + 2] = 90; }
  img.emit = new Uint8Array(144).fill(7);
  const near = (o: Img, x: number, y: number) => [...o.norm!.subarray((y * o.w + x) * 3, (y * o.w + x) * 3 + 3)];
  for (const deg of [30, 10]) {
    const o = rotate(img, deg), m = near(o, o.w >> 1, o.h >> 1), a = (deg * Math.PI) / 180;
    assert.deepEqual(m, [Math.round(90 * Math.cos(a)), Math.round(90 * Math.sin(a)), 90], `${deg} degrees clockwise: right turns toward down`);
    assert.ok(o.norm!.some((v, i) => i % 3 === 2 && v === 0 && o.data[i / 3 | 0] !== 0), `${deg}: the row without normals still has none`);
  }
  const s = img.scale(3);
  assert.deepEqual(near(s, 20, 20), [90, 0, 90]);
  assert.deepEqual(near(s, 20, 2), [0, 0, 0]);
  assert.equal(s.emit![35 * 36 + 35], 7);
});

test("normals: stamped art carries them; flat art drawn over clears them", () => {
  const p = load(`
sprite("n", "r", normals(0, 0, "6"))
scene("s", { w: 4, h: 1 }, stamp("n", 1, 0), stamp("n", 2, 0, { flip: "x" }), stamp("n", 3, 0), px(3, 0, "w"))`);
  assert.deepEqual(dir(p, "s", 1, 0), [1, 0]);
  assert.deepEqual(dir(p, "s", 2, 0), [-1, 0]);
  assert.deepEqual(dir(p, "s", 3, 0), [1, 0], "ops on the same canvas keep the normals under them");
  const q = load(`
sprite("n", "r", normals(0, 0, "6"))
scene("s", { w: 2, h: 1 }, stamp("n", 0, 0), layer("top", px(0, 0, "w")))`);
  assert.equal(dir(q, "s", 0, 0), null, "a flat layer on top clears them");
});

test("lighting: surfaces facing the lamp get brighter, facing away darker, flat unchanged; relief 0 ignores normals", () => {
  const src = (relief: number) => `
scene("s", { w: 20, h: 1, bg: "w" }, normals(8, 0, "456"), lamp(0, 0, { r: 40, z: 4 }), lighting({ cell: 1, relief: ${relief} }))
scene("ref", { w: 20, h: 1, bg: "w" }, lamp(0, 0, { r: 40, z: 4 }), lighting({ cell: 1 }))`;
  const p = load(src(1)), red = (q: typeof p, name: string, x: number) => q.image(name).get(x, 0) >>> 24;
  assert.ok(red(p, "s", 8) > red(p, "ref", 8), "facing the lamp (4 = left) is brighter");
  assert.ok(red(p, "s", 10) < red(p, "ref", 10), "facing away is darker");
  assert.ok(Math.abs(red(p, "s", 9) - red(p, "ref", 9)) <= 1, "flat normal matches unmapped art");
  const off = load(src(0));
  for (const x of [8, 9, 10]) assert.equal(red(off, "s", x), red(off, "ref", x));
});

test("lighting: sky light comes from above by default, from where skyDir says otherwise", () => {
  // three pixels stacked: facing up, flat, facing down
  const src = (dir: string) => `scene("s", { w: 1, h: 3, bg: "w" }, normals(0, 0, "8\\n5\\n2"), lighting({ cell: 1, sky: 1, ambient: 0${dir} }))`;
  const red = (dir: string) => [0, 1, 2].map((y) => load(src(dir)).image("s").get(0, y) >>> 24);
  const [up, , down] = red("");
  assert.ok(up > down, `facing up ${up} > facing down ${down}`);
  const [up2, , down2] = red(", skyDir: [0, 1]");
  assert.ok(up2 < down2, "from below: the other way round");
});

test("normal map image: engine encoding with green up, flat where unset", () => {
  const p = load(`sprite("a", "rrr", normals(0, 0, "8.."))`);
  const img = normalImage(p.image("a"));
  const [r, g, b] = [img.get(0, 0) >>> 24, (img.get(0, 0) >>> 16) & 255, (img.get(0, 0) >>> 8) & 255];
  assert.ok(g > 200 && Math.abs(r - 128) <= 1 && b > 128, "up-facing is green");
  assert.equal(img.get(1, 0) >>> 8, (128 << 16) | (128 << 8) | 255, "unset = flat");
});

// bump("hybrid") against what Sprite Fusion's own tests (tests/generation.rs at d14b067) ask of its maps
const image = (w: number, h: number, at: (x: number, y: number) => [number, number, number, number]) => {
  const img = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.set(x, y, pack(...at(x, y)));
  return img;
};
const hybridMap = (img: Img, o: BumpOpts = {}) => {
  bump(img, Uint8Array.from(img.data, (c) => (c & 255 ? 1 : 0)), { ...o, shape: "hybrid" });
  return normalImage(img);
};
const rgba = (img: Img, x: number, y: number) => { const c = img.get(x, y); return [c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255]; };
const disk = (size: number) => image(size, size, (x, y) => [145, 99, 63, Math.hypot(x - (size >> 1), y - (size >> 1)) <= (size >> 1) - 3 ? 255 : 0]);

test("bump hybrid: normals point outward and decode to unit vectors; flat art and no strength are flat", () => {
  const m = hybridMap(disk(31));
  assert.ok(rgba(m, 7, 15)[0] < 100 && rgba(m, 23, 15)[0] > 155, "left edge faces left, right edge right");
  assert.ok(rgba(m, 15, 7)[1] > 155 && rgba(m, 15, 23)[1] < 100, "top faces up (green up), bottom down");
  assert.deepEqual(rgba(m, 15, 15), [128, 128, 255, 255]);
  for (let y = 0; y < 31; y++)
    for (let x = 0; x < 31; x++) {
      const len = Math.hypot(...rgba(m, x, y).slice(0, 3).map((c) => c / 127.5 - 1));
      assert.ok(Math.abs(len - 1) < 0.01, `unit at ${x},${y}: ${len}`);
    }
  for (const o of [{ depth: 0 }, { shapeStrength: 0 }]) {
    const src = disk(31), out = hybridMap(src.copy(), o);
    for (let i = 0; i < src.data.length; i++) assert.equal(out.data[i], pack(128, 128, 255, src.data[i] & 255));
  }
});

test("bump hybrid: broad painted shading keeps its relief", () => {
  const m = hybridMap(image(64, 32, (x) => [40 + x * 3, 40 + x * 3, 40 + x * 3, 255]), { shapeStrength: 0 });
  for (let x = 12; x < 52; x++) {
    const [r, g] = rgba(m, x, 16);
    assert.ok(r < 123 && Math.abs(g - 128) <= 1, `x ${x}: ${r}, ${g}`);
  }
});

test("bump hybrid: alpha kept; hidden colors, padding and nearby islands change nothing", () => {
  const a = hybridMap(image(16, 16, (x, y) => [90, 160, 210, y * 16 + x]));
  for (let i = 0; i < 256; i++) {
    assert.equal(a.data[i] & 255, i);
    if (i <= 7) assert.equal(a.data[i] >>> 8, (128 << 16) | (128 << 8) | 255);
  }
  const hidden = disk(31);
  for (let i = 0; i < hidden.data.length; i++) if (!(hidden.data[i] & 255)) hidden.data[i] = pack(255, 20, 200, 0);
  assert.deepEqual(hybridMap(hidden).data, hybridMap(disk(31)).data);
  assert.ok(hybridMap(image(3, 9, () => [255, 80, 10, 0])).data.every((c) => c === pack(128, 128, 255, 0)));
  const sprite = (x: number) => [30 + x * 20, 80, 120, 255] as [number, number, number, number];
  const alone = hybridMap(image(9, 9, sprite));
  const sheet = hybridMap(image(42, 34, (x, y) => (x >= 5 && x < 14 && y >= 5 && y < 14 ? sprite(x - 5) : x >= 15 && x < 36 && y >= 5 && y < 28 ? [255, 255, 255, 255] : [0, 0, 0, 0])));
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) assert.equal(sheet.get(x + 5, y + 5), alone.get(x, y), `${x},${y}`);
});

test("bump hybrid: settings checked; the others refuse its options", () => {
  assert.match(failure(PAL + 'sprite("x", "rr", bump("hybrid", { detailScale: 0.2 }))', "x").message, /detailScale must be between 0.6 and 8, got 0.2/);
  assert.match(failure(PAL + 'sprite("x", "rr", bump("dome", { detailStrength: 2 }))', "x").message, /detailStrength only shape "hybrid" reads/);
});

test("edt: exact distances, as a brute-force search finds them", () => {
  let s = 75;
  for (let h = 1; h < 9; h++)
    for (let w = 1; w < 11; w++) {
      const inside = Uint8Array.from({ length: w * h }, () => ((s = (s * 1664525 + 1013904223) >>> 0) % 4 !== 0 ? 1 : 0));
      if (inside.every(Boolean)) continue;
      const d = edt(inside, w, h);
      for (let i = 0; i < w * h; i++) {
        let best = Infinity;
        for (let j = 0; j < w * h; j++) if (!inside[j]) best = Math.min(best, Math.hypot((i % w) - (j % w), Math.floor(i / w) - Math.floor(j / w)));
        assert.ok(Math.abs(d[i] - best) < 1e-9, `${w}x${h} at ${i}: ${d[i]} vs ${best}`);
      }
    }
});

test("normals option: a bumped sprite's and an anim's normal maps, read back, give the same normals", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-n-"));
  try {
    const p = load(`
sprite("rock", { w: 14, h: 10 }, (c) => { c.ellipse(7, 5, 6, 4, "g"); c.ellipse(5, 3, 2, 1, "w"); c.rect(6, 6, 5, 2, "r") }, bump("hybrid"))
anim("blob", { w: 9, h: 7, frames: 3 }, (c) => c.ellipse(4, 3, 2 + c.frame, 3, "g"), bump("dome", { depth: 2 }))`);
    assert.deepEqual(writeOutputs(p, dir, { preview: false }).errors, []);
    const art = join(dir, "back.px.js");
    writeFileSync(art, PAL + `sprite("rock", { png: "sprites/rock.png", normals: "sprites/rock_n.png" })
anim("blob", { png: "anims/blob.png", normals: "anims/blob_n.png", frames: 3 })
sprite("blob1", { png: "anims/blob.png", normals: "anims/blob_n.png", area: [9, 0, 9, 7] })`);
    const q = loadProject(art), same = (a: Img, b: Img, what: string) => {
      assert.ok(a.norm!.some((v, i) => i % 3 !== 2 && v !== 0), `${what}: it has relief`);
      assert.deepEqual([...b.norm!], [...a.norm!], what);
    };
    same(p.image("rock"), q.image("rock"), "rock");
    for (const f of [0, 1, 2]) same(p.image("blob", 0, f * 125), q.image("blob", 0, f * 125), `blob frame ${f}`);
    same(p.image("blob", 0, 125), q.image("blob1"), "an area of the strip");
    assert.match(failure(PAL + 'sprite("x", { normals: "x_n.png" })', "x").message, /normal map of its png: give png too/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build: animations and sheets with normals or light given also write them as atlases laid out like the art", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-n-"));
  try {
    // the blob's eye glows (80% strength: 204) in its second frame only
    const p = load(`
anim("blob", { w: 6, h: 5, frames: 2 }, (c) => c.ellipse(3, 2, 2 + c.frame, 2, "g"), bump("hybrid"), (c) => { if (c.frame) c.px(3, 2, "r") }, effect("emit", { on: "r", strength: 0.8 }))
sprite("flat", "rr")
sheet("all", ["blob", "flat"], { pad: 1 })`);
    assert.deepEqual(writeOutputs(p, dir, { preview: false }).errors, []);
    for (const [art, nrm, glow] of [["anims/blob.png", "anims/blob_n.png", "anims/blob_e.png"], ["all.png", "all_n.png", "all_e.png"]]) {
      const a = decodePng(readFileSync(join(dir, art))), n = decodePng(readFileSync(join(dir, nrm))), e = decodePng(readFileSync(join(dir, glow)));
      assert.deepEqual([n.w, n.h, e.w, e.h], [a.w, a.h, a.w, a.h]);
      for (let i = 0; i < a.data.length; i++) assert.equal(n.data[i] & 255, a.data[i] & 255, `${nrm}: alpha at ${i}`);
      for (let i = 0; i < a.data.length; i++) assert.equal(e.data[i] & 255, a.data[i] & 255, `${glow}: alpha at ${i}`);
      // where the art glows its map is grey 204, elsewhere black: the one pixel, in the second frame's rectangle
      const lit = [...e.data.keys()].filter((i) => e.data[i] >>> 8), x0 = art.startsWith("anims") ? 6 : 7;
      assert.deepEqual(lit.map((i) => [i % e.w, Math.floor(i / e.w), e.data[i] >>> 8]), [[x0 + 3, 2, 0xcccccc]]);
    }
    assert.ok(!existsSync(join(dir, "sprites", "flat_e.png")), "nothing glows: no map");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
