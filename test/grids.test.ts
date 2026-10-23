// A field made voxels and a mesh (grids.ts), drawn as cubes (voxels()), written as .vox, .obj and .glb
// (files3d.ts) and read back: cells of any size in meters, a cube's px apart from them, things of
// different cells at their depths, MagicaVoxel's 256 a side refused with a size that fits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sdf } from "../src/core/sdf.ts";
import { Voxels, surfaceNets, voxelFaces, voxelize } from "../src/core/grids.ts";
import { encodeGlb, encodeObj, encodeVox, readGlb, readObj, readVox } from "../src/core/files3d.ts";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { keys, PAL } from "./helpers.ts";

test("voxels: cells of a size (one or per axis), columns down the origin's upright, thin parts kept, the material there", () => {
  const rod = sdf.cylinder(0.04, 1).mat("wood");
  // a rod far thinner than a cell: a column of cells down the middle, not nothing
  const G = voxelize(rod, { size: 0.25 });
  assert.deepEqual(G.n, [1, 1, 4]); assert.equal(G.count, 4); assert.deepEqual(G.mats, ["wood"]);
  assert.equal(voxelize(rod, { size: 0.25, fill: 0 }).count, 4, "the middle inside: the column too");
  // a ball of 1 m: cubes of 0.5 m and flat slabs of 0.5 x 0.5 x 0.25, twice as many layers
  const ball = sdf.sphere(1).at(0, 0, 1).paint("top", (p) => p[2] > 1.5);
  const a = voxelize(ball, { size: 0.5, fill: 0 }), b = voxelize(ball, { size: [0.5, 0.5, 0.25], fill: 0 });
  assert.deepEqual(a.size, [0.5, 0.5, 0.5]); assert.equal(b.n[2], 2 * a.n[2]);
  assert.ok(Math.abs(b.count / a.count - 2) < 0.35, `${b.count} slabs, ${a.count} cubes`);
  assert.equal(a.mats.includes("top"), true); assert.equal(a.bounds()[0][2], 0, "the ground a floor of cells");
  assert.throws(() => voxelize(ball, { size: [0.5, 0] }), /size is a cell's size in m/);
  assert.throws(() => voxelize(sdf.density(ball) as never, { size: 0.5 }), /not a density/);
  // the same field the same cells; the clock moves it
  assert.deepEqual(voxelize(ball, { size: 0.25 }).cells, voxelize(ball, { size: 0.25 }).cells);
  const moving = sdf.sphere(0.5).at((c) => [c.phase * 2, 0, 0.5]);
  assert.notDeepEqual(voxelize(moving, { size: 0.25, clock: { t: 0, phase: 0.5, frame: 1, frames: 2 } }).origin, voxelize(moving, { size: 0.25 }).origin);
});

test("meshes: surface nets on the surface, quads facing out; a grid's outside merged into rectangles", () => {
  const M = surfaceNets(sdf.sphere(1).mat("stone"), { size: 0.23 }), P = M.positions;
  assert.ok(M.quads.length / 4 > 100);
  for (let i = 0; i < P.length / 3; i++) assert.ok(Math.abs(Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) - 1) < 0.02, "a vertex on the surface");
  for (let q = 0; q < M.quads.length / 4; q++) {
    const v = [0, 1, 2].map((k) => M.quads[q * 4 + k] * 3), e1 = [0, 1, 2].map((e) => P[v[1] + e] - P[v[0] + e]), e2 = [0, 1, 2].map((e) => P[v[2] + e] - P[v[0] + e]);
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    assert.ok(n[0] * P[v[0]] + n[1] * P[v[0] + 1] + n[2] * P[v[0] + 2] > 0, "facing out");
  }
  // every edge of the closed mesh between two quads
  const edges = new Map<string, number>();
  for (let q = 0; q < M.quads.length / 4; q++) for (let k = 0; k < 4; k++) { const a = M.quads[q * 4 + k], b = M.quads[q * 4 + ((k + 1) % 4)], key = a < b ? `${a},${b}` : `${b},${a}`; edges.set(key, (edges.get(key) ?? 0) + 1); }
  assert.ok([...edges.values()].every((v) => v === 2), "closed");
  assert.equal(M.faces[0].mat, "stone"); assert.equal(M.faces[0].pts.length, 4);
  // two cells side by side: six faces, the shared one gone, the long sides one rectangle each
  const two = new Voxels([2, 1, 1], [1, 1, 1], [0, 0, 0], new Uint8Array([1, 1]), ["a"]), F = voxelFaces(two);
  assert.equal(F.quads.length / 4, 6);
});

test("files: .vox, .obj and .glb written and read back; a grid past 256 a side refused with a size that fits", () => {
  const G = voxelize(sdf.sphere(1).mat("a").union(sdf.box([0.5, 0.5, 0.5]).at(0, 0, 1.2).mat("b")), { size: 0.25 });
  const vox = readVox(encodeVox(G, [0xff0000ff, 0x00ff00ff]));
  assert.deepEqual(vox.size, G.n); assert.equal(vox.count, G.count); assert.equal(vox.colors, 2);
  const big = new Voxels([300, 2, 2], [0.01, 0.01, 0.01], [0, 0, 0], new Uint8Array(1200), [""]);
  assert.throws(() => encodeVox(big, []), /300 x 2 x 2 cells; MagicaVoxel holds 256 a side.*\[0\.012/);
  const M = surfaceNets(sdf.box([1, 1, 2]).at(0, 0, 1).mat("a"), { size: 0.25 }), glb = readGlb(encodeGlb(M, "t", [0x808080ff]));
  assert.equal(glb.vertices, M.positions.length / 3); assert.equal(glb.triangles, M.quads.length / 2);
  // z up goes out y up: the box 2 m tall from the ground
  assert.ok(Math.abs(glb.min[1]) < 0.01 && Math.abs(glb.max[1] - 2) < 0.01, `${glb.min} ${glb.max}`);
  const obj = readObj(encodeObj(M, "t", [0x808080ff]).obj);
  assert.equal(obj.vertices, glb.vertices); assert.equal(obj.faces, M.quads.length / 4);
});

const CUBE = PAL + `const one = new Uint8Array([1])
`;
test("voxels(): a cube on the pixel grid in iso, its top lit and its sides a tone each; cells of two sizes at their depths", () => {
  // one cell 0.25 m, 4 px wide: a 2:1 top two rows tall, sides two rows, the far right side the darkest
  const rows = keys(loadSource(PAL + `ramps("kgw")
sprite("a", { w: 8, h: 8 }, voxels(sdf.voxels(sdf.box(0.2).at(0, 0, 0.1), { size: 0.25 }), { view: "iso", px: 4, at: [4, 6], mats: { m: "kgw" }, outline: false, rim: false }))`, "t.px.js"), "a").split("\n");
  const drawn = rows.map((r) => r.replace(/\./g, "").length);
  assert.deepEqual(drawn.filter(Boolean), [2, 4, 4, 2], rows.join("\n"));
  const top = rows.findIndex((r) => r.includes("w") || r.includes("g") || r.includes("k"));
  assert.equal(rows[top].replace(/\./g, ""), "ww", "the top lit");
  const side = rows[top + 2].replace(/\./g, "");
  assert.notEqual(side[0], side[3], "a tone each side");
  // a coarse block in front of a fine one behind it: the coarse wins where they overlap
  const scene = (front: boolean) => keys(loadSource(PAL + `ramps("kgw", "krr")
scene("a", { w: 40, h: 40 }, (c) => {
  c.voxels(sdf.voxels(sdf.box(1).at(0, 0, 0.5).mat("b"), { size: 0.0625 }), { view: { kind: "iso", origin: [20, 30] }, ppm: 8, at: [0, ${front ? 0 : 1.5}, 0], mats: { a: "kgw", b: "krr" } })
  c.voxels(sdf.voxels(sdf.box(1).at(0, 0, 0.5).mat("a"), { size: 0.5 }), { view: { kind: "iso", origin: [20, 30] }, ppm: 8, at: [0.5, ${front ? 1.5 : 0}, 0], mats: { a: "kgw", b: "krr" } })
})`, "t.px.js"), "a");
  const reds = (s: string) => (s.match(/r/g) ?? []).length;
  assert.ok(reds(scene(true)) > reds(scene(false)), "the fine one in front shows more of itself than behind");
});

test("export3d: build writes the files and says what they hold, read back", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl3d-"));
  try {
    const p = loadSource(PAL + `ramps("kgw")
const f = sdf.sphere(0.5).at(0, 0, 0.5).mat("m")
export3d("ball", sdf.voxels(f, { size: 0.25 }), { mats: { m: "kgw" }, as: ["vox", "glb"] })
export3d("ballmesh", sdf.mesh(f, { size: 0.25 }), { mats: { m: "kgw" } })`, "t.px.js");
    const r = writeOutputs(p, dir, { preview: false });
    assert.deepEqual(r.errors, []);
    assert.match(r.lines.join("\n"), /vox ball 5x5x4, \d+ voxels of 0\.25 x 0\.25 x 0\.25 m.*1 colors/);
    assert.match(r.lines.join("\n"), /glb ballmesh \d+ vertices/);
    assert.equal(readVox(new Uint8Array(readFileSync(join(dir, "ball.vox")))).size.join(), "5,5,4");
    assert.ok(readObj(readFileSync(join(dir, "ballmesh.obj"), "utf8")).faces > 10);
    assert.match(readFileSync(join(dir, "ballmesh.mtl"), "utf8"), /newmtl m\nKd /);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
