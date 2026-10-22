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
  assert.match(failure(scene(`[{ name: "s", at: [0, 4] }]`, "(p) => [p[0], p[1], p[2]]"), "a").message, /sprites stand in a perspective view/);
  assert.match(failure(scene(`[]`).replace("{}, { sprites: [] }", '{ m: { tex: "_white", texel: 0 } }, {}'), "a").message, /texel 0: a texel's size in m/);
});
