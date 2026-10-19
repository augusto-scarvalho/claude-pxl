import { test } from "node:test";
import assert from "node:assert/strict";
import { failure, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";
import { normalImage } from "../src/core/normals.ts";

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
