// Procedural Gaussian splats (splats.ts): a surface's flat discs along its normals, a density's round
// blobs; rasterized to pixel art (thick inside, in its ramp, hidden by a wall through a camera); a 3DGS
// .ply written and read back, Y up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sdf } from "../src/core/sdf.ts";
import { SPLAT_LIGHT, makeSplats } from "../src/core/splats.ts";
import { encodePly, readPly } from "../src/core/files3d.ts";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { keys, PAL } from "./helpers.ts";

test("splats: a surface as flat discs on it along its normals, the sun each sees; a density's inside as round blobs, as dense as it is", () => {
  const S = makeSplats(sdf.sphere(1).mat("m"), { spacing: 0.1 });
  assert.ok(S.n > 800, `${S.n}`);
  assert.deepEqual(S.mats, ["m"]);
  for (let i = 0; i < S.n; i++) {
    const p = [0, 1, 2].map((e) => S.pos[i * 3 + e]), n = [0, 1, 2].map((e) => S.normal[i * 3 + e]), r = Math.hypot(...p);
    assert.ok(Math.abs(r - 1) < 0.02, "on the surface");
    assert.ok(n.every((v, e) => Math.abs(v - p[e] / r) < 0.05), "its normal");
    // its turn takes its thin axis (z) to the normal
    const [w, x, y, z] = [0, 1, 2, 3].map((k) => S.rot[i * 4 + k]), zx = 2 * (x * z + w * y), zy = 2 * (y * z - w * x), zz = 1 - 2 * (x * x + y * y);
    assert.ok(Math.abs(zx - n[0]) < 1e-4 && Math.abs(zy - n[1]) < 1e-4 && Math.abs(zz - n[2]) < 1e-4, "turned to its normal");
    assert.ok(Math.abs(S.scale[i * 3 + 2] * 6 - S.scale[i * 3]) < 1e-6, "flat");
    const facing = n[0] * SPLAT_LIGHT[0] + n[1] * SPLAT_LIGHT[1] + n[2] * SPLAT_LIGHT[2];
    if (Math.abs(facing) > 0.1) assert.equal(S.sun[i], facing > 0 ? 1 : 0, "the sun on its lit side");
  }
  assert.equal(makeSplats(sdf.sphere(1), { spacing: 0.1 }).pos.join(), S.pos.join(), "the same seed, the same splats");
  const B = makeSplats(sdf.density(sdf.sphere(0.5), { edge: 0.5 }), { spacing: 0.1 });
  for (let i = 0; i < B.n; i++) {
    assert.ok(Math.hypot(B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]) < 0.5, "inside");
    assert.equal(B.scale[i * 3], B.scale[i * 3 + 2], "round");
  }
  const mid = [...Array(B.n).keys()].sort((a, b) => Math.hypot(B.pos[a * 3], B.pos[a * 3 + 1], B.pos[a * 3 + 2]) - Math.hypot(B.pos[b * 3], B.pos[b * 3 + 1], B.pos[b * 3 + 2]));
  assert.ok(B.opacity[mid[0]] > B.opacity[mid[mid.length - 1]], "denser in the middle, more opaque");
  assert.throws(() => makeSplats(sdf.occupancy(sdf.sphere(1)) as never), /not an occupancy/);
});

test("splats(): thick in its ramp, a wall through the camera hides it; .ply in 3DGS's layout read back, Y up", () => {
  const rows = keys(loadSource(PAL + `ramps("kgw")
sprite("a", { w: 24, h: 24 }, splats(sdf.sphere(0.6).at(0, 0, 0.6), { spacing: 0.1, view: "side", ppm: 16, ramp: "kgw" }))`, "t.px.js"), "a").split("\n");
  assert.ok(/^[kgw]{14,}$/.test(rows[13].replace(/\./g, "")), rows.join("\n"));
  assert.equal(rows[1], "........................");
  const scene = (wall: boolean) => keys(loadSource(PAL + `ramps("kgw", "krr")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }, M = model()
M.face("g", [-5, 0.5, 0], [5, 0.5, 0], [5, 20, 0], [-5, 20, 0])
${wall ? `M.box("s", [-1, 3, 0], [1, 3.1, 0.8])` : ""}
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { g: { ramp: "g" }, s: { ramp: "r" } }),
  (c) => c.splats(sdf.sphere(0.35), { spacing: 0.08, view: V, at: [0, 4, 0.5], ramp: "kw" }))`, "t.px.js"), "a").split("\n");
  assert.ok(/[kw]/.test(scene(false)[15].slice(17, 23)) && !/[kw]/.test(scene(true)[15].slice(17, 23)), "the wall hides it");
  // the file: the 3DGS properties, its box turned y up, its opacities and radii back
  const S = makeSplats(sdf.box([1, 1, 2]).at(0, 0, 1), { spacing: 0.2 }), r = readPly(encodePly(S, [[0x808080ff]]));
  assert.equal(r.count, S.n);
  assert.deepEqual(r.props, ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]);
  assert.ok(r.min[1] < 0.05 && r.max[1] > 1.95, `z up out as y: ${r.min} ${r.max}`);
  assert.ok(Math.abs(r.opacity - 0.92) < 1e-3 && Math.abs(r.scale - S.scale[0]) < 1e-4);
  const dir = mkdtempSync(join(tmpdir(), "pxlply-"));
  try {
    const out = writeOutputs(loadSource(PAL + `ramps("kgw")
export3d("b", sdf.splats(sdf.sphere(0.5).mat("m"), { spacing: 0.2 }), { mats: { m: "kgw" } })`, "t.px.js"), dir, { preview: false });
    assert.deepEqual(out.errors, []);
    assert.match(out.lines.join("\n"), /ply b \d+ splats \(3DGS: 17 properties\)/);
    assert.equal(readPly(new Uint8Array(readFileSync(join(dir, "b.ply")))).props.length, 17);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
