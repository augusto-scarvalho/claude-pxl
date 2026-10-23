// A field made voxels and a mesh (grids.ts), drawn as cubes (voxels()), written as .vox, .obj and .glb
// (files3d.ts) and read back: cells of any size in meters, a cube's px apart from them, things of
// different cells at their depths, a grid past MagicaVoxel's 256 a side as several models.
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

test("files: .vox, .obj and .glb written and read back; a grid past 256 a side as models of 256 in place", () => {
  const G = voxelize(sdf.sphere(1).mat("a").union(sdf.box([0.5, 0.5, 0.5]).at(0, 0, 1.2).mat("b")), { size: 0.25 });
  const vox = readVox(encodeVox(G, [0xff0000ff, 0x00ff00ff]));
  assert.deepEqual(vox.size, G.n); assert.equal(vox.count, G.count); assert.equal(vox.colors, 2);
  // past 256 a side: models of 256 placed by the scene graph, each cell where it was (the middle across at 0)
  const cells = new Uint8Array(1200).map((_, q) => (q % 7 ? 1 : 0)), big = new Voxels([300, 2, 2], [0.01, 0.01, 0.01], [0, 0, 0], cells, [""]), r = readVox(encodeVox(big, []));
  assert.equal(r.models, 2); assert.equal(r.count, big.count); assert.deepEqual(r.size, [300, 2, 2]);
  const want = [...cells].flatMap((v, q) => (v ? [`${(q % 300) - 150},${Math.floor(q / 300) % 2 - 1},${Math.floor(q / 600)}`] : []));
  assert.deepEqual(new Set(r.cells.map((c) => c.join())), new Set(want));
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

test("voxels(): creases darker with ao (off by default); from the side on the pixel grid; a field on the same grid lines up", () => {
  const p = loadSource(PAL + `ramps("kgw")
const B = sdf.box(0.5).at(0, 0, 0.25), F = sdf.box([0.75, 0.75, 0.25]).at(0, 0, 0.125).union(sdf.box(0.25).at(0, 0, 0.375))
const o = { px: 4, mats: { m: "kgw" }, outline: false, rim: false }
sprite("plain", { w: 16, h: 14 }, voxels(sdf.voxels(F, { size: 0.25 }), { ...o, view: "top", at: [8, 12] }))
sprite("ao0", { w: 16, h: 14 }, voxels(sdf.voxels(F, { size: 0.25 }), { ...o, view: "top", at: [8, 12], ao: 0 }))
sprite("ao", { w: 16, h: 14 }, voxels(sdf.voxels(F, { size: 0.25 }), { ...o, view: "top", at: [8, 12], ao: 1 }))
sprite("vox", { w: 12, h: 12 }, voxels(sdf.voxels(B, { size: 0.5 }), { ...o, px: 8, view: "iso", at: [6, 10] }))
sprite("field", { w: 12, h: 12 }, surface(B, { mats: o.mats, outline: false, rim: false, ppm: 8, view: { kind: "iso", grid: true }, at: [6, 10] }))
sprite("side", { w: 12, h: 12 }, voxels(sdf.voxels(B, { size: 0.5 }), { ...o, px: 8, view: { kind: "side", grid: true }, at: [6, 10] }))`, "t.px.js");
  const lit = (n: string) => (keys(p, n).match(/w/g) ?? []).length;
  assert.equal(keys(p, "plain"), keys(p, "ao0"));
  assert.ok(lit("ao") < lit("ao0") - 4, "the floor's faces darker toward the cube on it");
  const shape = (n: string) => keys(p, n).replace(/[^.\n]/g, "#");
  assert.equal(shape("field"), shape("vox"), "a field's cube on the grid covers what the voxel's does");
  const rows = keys(p, "side").split("\n").filter((r) => /[kgw]/.test(r));
  assert.deepEqual(rows.map((r) => r.replace(/\./g, "").length), Array(10).fill(8), "an 8 px front and a 2 px sliver of top");
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
    // a loop's moments: an animated .glb (a mesh each, shown in turn), a .vox and an .obj each
    const q = loadSource(PAL + `ramps("kgw")
const f = sdf.sphere(0.4).at((c) => [c.phase, 0, 0.4]).mat("m")
export3d("roll", (c) => sdf.mesh(f, { size: 0.25, clock: c }), { mats: { m: "kgw" }, frames: 3, fps: 6 })
export3d("rollv", (c) => sdf.voxels(f, { size: 0.25, clock: c }), { mats: { m: "kgw" }, frames: 2, as: ["vox", "obj"] })`, "t.px.js");
    const s = writeOutputs(q, dir, { preview: false });
    assert.deepEqual(s.errors, []);
    const g = readGlb(new Uint8Array(readFileSync(join(dir, "roll.glb"))));
    assert.equal(g.meshes, 3); assert.equal(g.seconds, 0.5);
    assert.match(s.lines.join("\n"), /glb roll .*the first of 3 moments, a loop of 0\.5 s/);
    assert.equal(readVox(new Uint8Array(readFileSync(join(dir, "rollv_1.vox")))).count > 0, true);
    assert.match(readFileSync(join(dir, "rollv_0.obj"), "utf8"), /mtllib rollv_0\.mtl/);
    assert.throws(() => loadSource(PAL + `export3d("x", (c) => sdf.mesh(sdf.sphere(1), { size: 0.5, clock: c }))`, "t.px.js"), /frames: n moments/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
