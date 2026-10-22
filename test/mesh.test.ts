// mesh() as a stage: textured faces, sprites standing among them in one depth, contact shadows, and
// faces that reach behind the eye. A level camera 1 m up, the horizon on row 10, 40 px of focal
// length: a point z m ahead and u m up lands on row 10 + 40 (1 - u) / z.
import { test } from "node:test";
import assert from "node:assert/strict";
import { failure, keys, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";

const STAGE = `ramps("kgw")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }
sprite("s", { w: 2, h: 20, pivot: "bottom" }, rect(0, 0, 2, 20, "r"))
sprite("_white", "w")
`;
const rows = (body: string) => keys(loadSource(PAL + STAGE + body, "t.px.js"), "a").split("\n");

test("mesh sprites: a wall hides what stands behind it below its top, and nothing in front of it", () => {
  // the wall's top, 0.5 m up at z 3.2, on row 16.25; its foot at z 3 on row 23.3
  const wall = `const M = model(); M.box("stone", [-1, 3, 0], [1, 3.2, 0.5])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { stone: { ramp: "kgw" } }, { sprites: [{ name: "s", at: [0, Z], shadow: 0 }] }))`;
  const behind = rows(`const Z = 4\n${wall}`), front = rows(`const Z = 2.5\n${wall}`);
  // behind (feet on row 20): seen above the wall's top, hidden below it
  assert.equal(behind[10][20], "r");
  assert.notEqual(behind[18][20], "r", "below the wall's top");
  // in front (feet on row 26): over the wall
  assert.equal(front[18][20], "r");
});

test("mesh textures: tiled in meters, stepped by the light; contact shadows; faces reaching behind the eye", () => {
  const r = rows(`const M = model()
M.face("floor", [-5, -5, 0], [5, -5, 0], [5, 20, 0], [-5, 20, 0])
M.box("block", [1, 3, 0], [2, 4, 1])
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { floor: { tex: "_white" }, block: { tex: "_white" } }, { sprites: [{ name: "s", at: [-1, 4], shadow: 0.6 }] }))`);
  // the floor runs from behind the eye out to z 20 (row 12): the bottom row is still floor
  assert.equal(r[39][5], "w", "a face reaching behind the eye is drawn up to it");
  assert.equal(r[30][5], "w", "the floor, lit from above, as the texture is drawn");
  // the block's faces toward us and to its left (columns 33 on) take less of the sun than its top
  assert.ok(r.some((row) => row.includes("g")), "a face turned from the light a step darker");
  // under the sprite's feet (column 10, row 20: z 3.8 there, 3.5 a row down): the floor two steps
  // darker in the shadow's middle, one out to its 0.6 m
  assert.equal(r[20][10], "k");
  assert.equal(r[21][10], "g");
  assert.equal(r[21][2], "w", "away from the feet, untouched");
});

test("mesh sprites: errors say what a sprite is and where sprites can stand", () => {
  const scene = (sprites: string, view = "V") => PAL + STAGE + `scene("a", { w: 40, h: 40 }, (c) => c.mesh(${view}, [], {}, { sprites: ${sprites} }))`;
  assert.match(failure(scene(`[{ name: "s", at: [0] }]`), "a").message, /sprite 0 is \{ name, at: \[x, z\] or \[x, z, up\]/);
  assert.match(failure(scene(`[{ name: "s", at: [0, 4] }]`, "(p) => [p[0], p[1], p[2]]"), "a").message, /sprites need a perspective view/);
  assert.match(failure(scene(`[]`).replace("{}, { sprites: [] }", '{ m: { tex: "_white", texel: 0 } }, {}'), "a").message, /texel 0: a texel's size in m/);
});

// post() over a checkered floor from z 1.5 out: row 10 + 40 / z, so row 30 is 2 m away, row 12 is 20
const FLOOR = `sprite("_check", "kw\\nwk")
const M = model(); M.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0])
const floor = (c) => c.mesh(V, M.faces, { f: { tex: "_check", texel: 0.25 } })
`;
test("post: the depth in focus stays as drawn, in the palette; farther is blurred, hazed, and off it", () => {
  const r = rows(FLOOR + `scene("a", { w: 40, h: 40 }, floor, post({ blur: 3, focus: [20, 30], sharp: 0.3, soft: 0.5, fog: { color: "r", from: 10, to: 20, max: 0.5 } }))`);
  assert.ok(!r[30].includes("?"), `in focus: ${r[30]}`);
  assert.ok([...r[12]].filter((k) => k === "?").length > 30, `far: ${r[12]}`);
  const p = loadSource(PAL + STAGE + FLOOR + `scene("a", { w: 40, h: 40 }, floor, post({ fog: { color: "r", from: 10, to: 20 } }))`, "t.px.js");
  const far = p.image("a").get(5, 12);
  assert.ok(far >>> 24 > ((far >>> 16) & 255) + 40, "far away, the haze's red");
  assert.ok(!keys(p, "a").split(String.fromCharCode(10))[30].includes("?"), "near, untouched");
});

test("post: errors; a sprite's pixel can be K x K; a scene saying check: false isn't checked", async () => {
  assert.match(failure(PAL + STAGE + `scene("a", { w: 40, h: 40, bg: "w" }, post({ blur: 3 }))`, "a").message, /put post\(\) after a mesh\(\)/);
  assert.match(failure(PAL + STAGE + FLOOR + `scene("a", { w: 40, h: 40 }, floor, post({ blur: 3, focus: [20, 2] }))`, "a").message, /drew nothing at the focus \[20, 2\]/);
  const big = rows(`scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, [], {}, { sprites: [{ name: "_white", at: [0, 4], shadow: 0 }], pixel: 3 }))`);
  const at = big.flatMap((l, y) => [...l].flatMap((k, x) => (k === "w" ? [[x, y]] : [])));
  assert.equal(at.length, 9, "one pixel, 3 x 3");
  assert.deepEqual([0, 1].map((e) => Math.max(...at.map((p) => p[e])) - Math.min(...at.map((p) => p[e]))), [2, 2]);
  const { checkProject } = await import("../src/node/check.ts");
  const p = loadSource(PAL + STAGE + FLOOR + `scene("a", { w: 40, h: 40, check: false }, floor)`, "t.px.js", { checksOnly: true });
  assert.match(checkProject(p).notes.join("\n"), /a › not checked \(check: false\)/);
});

// light in the world over a white floor, a 1 m block at x 0..0.3, z 3..4, the sun low on the left
const LIT = `const B = model()
B.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0]); B.box("f", [0, 3, 0], [0.3, 4, 1])
sprite("_ball", { w: 8, h: 8, pivot: "bottom" }, circ(3, 3, 3, "w"), bump("hybrid"))
const lit = (o) => (c) => c.mesh(V, B.faces, { f: { tex: "_white" } }, { light: [-1, 0, 0.8], sun: "w", sky: { color: "w", strength: 0.2 }, ...o })
`;
const red = (body: string, x: number, y: number, opts = {}) => loadSource(PAL + STAGE + LIT + body, "t.px.js", opts).image("a").get(x, y) >>> 24;

test("mesh light: the sun's shadow, a lamp's pool, what gives light, a sprite's normals; none when only checking", () => {
  // the floor at x 0.6, z 3.5 (column 27, row 21) is behind the block from the sun, at x -0.6 (column 13) it isn't
  const scene = (o: string) => `scene("a", { w: 40, h: 40 }, lit(${o}))`;
  assert.ok(red(scene("{}"), 13, 21) > red(scene("{}"), 27, 21) + 40, "in the block's shadow");
  assert.equal(red(scene("{ shadows: false }"), 27, 21), red(scene("{ shadows: false }"), 13, 21), "no shadows: lit alike");
  // a lamp at x -1, z 5, 2 m: the floor under it (column 12, row 18) against beyond its reach (column 30)
  const lamp = `{ sun: { color: "w", strength: 0 }, lamps: [{ at: [-1, 5, 0.5], color: "w", r: 2, strength: 2 }] }`;
  assert.ok(red(scene(lamp), 12, 18) > red(scene(lamp), 30, 18) + 40, "the lamp's pool");
  assert.equal(rows(LIT + scene(`{ emit: "w" }`))[21][27], "w", "what gives light is drawn as it is, shadow or not");
  // a ball with a normal map standing at z 4 (columns 16..23, rows 12..19): its side toward the sun lighter
  const ball = `scene("a", { w: 40, h: 40 }, lit({ shadows: false, sprites: [{ name: "_ball", at: [0, 4], shadow: 0 }] }))`;
  assert.ok(red(ball, 17, 16) > red(ball, 22, 16) + 20, "lit on its left");
  assert.equal(red(scene("{}"), 27, 21, { checksOnly: true }), red(`scene("a", { w: 1, h: 1, bg: "w" })`, 0, 0), "only checking: as drawn");
});

test("mesh textures: their clear pixels are holes; anchored to the face they start at its top left", () => {
  // a fence 1 m high at z 3, x -0.9 to 1.1, of bars 0.25 m wide (red, then clear), over a white floor
  const fence = (anchor: string) => rows(`sprite("_bars", "r.")
const M = model()
M.face("f", [-9, 1.5, 0], [9, 1.5, 0], [9, 60, 0], [-9, 60, 0]); M.face("b", [-0.9, 3, 0], [1.1, 3, 0], [1.1, 3, 1], [-0.9, 3, 1])
scene("a", { w: 40, h: 40, bg: "k" }, (c) => c.mesh(V, M.faces, { f: { tex: "_white" }, b: { tex: "_bars", texel: 0.25, ${anchor} } }))`);
  // x -0.8 (column 9) is in the first bar either way; x -0.7 (column 10) in it only from the face's edge
  const face = fence(`anchor: "face"`), world = fence(`anchor: "world"`);
  assert.equal(face[18][9], "r");
  assert.equal(face[18][10], "r", "the bars start at the face's left");
  assert.equal(world[18][10], "w", "tiled from the world's origin, a hole there: the floor behind shows through");
  // two texels, across and down: the bars 0.5 m wide (x -0.6, 0.3 m in, is in the first)
  assert.equal(face[18][11], "w");
  assert.equal(fence(`anchor: "face", texel: [0.5, 1]`)[18][11], "r");
  assert.throws(() => fence(`texel: [0.5]`), /texel \[0\.5\].*or two, across and down/);
});
