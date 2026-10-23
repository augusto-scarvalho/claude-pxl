// Density volumes (sdf.ts's Density, volume.ts): noise that flows and closes its loop, thinning away up;
// drawn as pixel art (thick inside, dithered where thin, in the palette; what glows marked), and through
// a camera after a mesh(): hidden by what is nearer, over what is behind, its shadow and its glow on the
// ground.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sdf } from "../src/core/sdf.ts";
import { loadSource } from "../src/node/load.ts";
import { keys, PAL } from "./helpers.ts";

const at = (phase: number) => ({ t: 0, phase, frame: 0, frames: 1 });
test("density: from a shape, its edge eaten by seeded noise that flows and closes its loop, thinning away up", () => {
  const D = sdf.density(sdf.sphere(1), { edge: 0.5, noise: 0.3, scale: 0.4, seed: 3, flow: [1, 0, 2], fade: [0.2, 0.8] });
  const pts = Array.from({ length: 40 }, (_, i) => [Math.sin(i) * 0.9, Math.cos(i * 1.7) * 0.9, Math.sin(i * 0.3) * 0.15]);
  assert.deepEqual(pts.map((p) => D.at(p, at(0))), pts.map((p) => D.at(p, at(1))), "the loop closes");
  assert.notDeepEqual(pts.map((p) => D.at(p, at(0))), pts.map((p) => D.at(p, at(0.5))), "it flows between");
  assert.equal(D.at([0, 0, 0.9]), 0, "none above the fade's top"); assert.ok(D.at([0, 0, 0]) > 0.5);
  assert.equal(D.at([0, 0, 1.4]), 0, "none past the noise's reach");
  const [lo, hi] = D.bounds();
  assert.ok(Math.abs(lo[0] + 1.3) < 1e-9 && Math.abs(hi[2] - 1.3) < 1e-9, "its box grown by the noise");
  assert.throws(() => sdf.density(sdf.sphere(1), { fade: [1, 0.5] } as never), /fade is \[z0, z1\]/);
});

const BALL = PAL + `ramps("kgw")
const D = sdf.density(sdf.sphere(0.6).at(0, 0, 0.6), { edge: 0.6 })
`;
test("volume(): thick inside, dithered where thin, its tones from its ramp; what glows marked; a density only", () => {
  const p = loadSource(BALL + `sprite("a", { w: 24, h: 24 }, volume(D, { view: "side", ppm: 18, ramp: "kgw", thickness: 4 }))
sprite("b", { w: 24, h: 24 }, volume(D, { view: "side", ppm: 18, ramp: "kg", thickness: 4, emit: { ramp: "w", strength: 2 } }))
sprite("deep", { w: 24, h: 24 }, volume(D, { view: "side", ppm: 18, ramp: "kgw", thickness: 4, shadow: 1 }))
sprite("lit", { w: 24, h: 24 }, volume(D, { view: "side", ppm: 18, ramp: "kgw", thickness: 4, shadow: 0.1 }))`, "t.px.js");
  const rows = keys(p, "a").split("\n"), mid = rows[13];
  // its own shadow deeper, or the light reaching through it
  const light = (n: string) => (keys(p, n).match(/w/g) ?? []).length;
  assert.ok(light("deep") < light("a") && light("a") <= light("lit"), `${light("deep")} ${light("a")} ${light("lit")}`);
  assert.ok(/^[kgw]+$/.test(mid.replace(/\./g, "")) && mid.replace(/\./g, "").length > 10, "drawn in its ramp, thick across its middle");
  // its rim: a dither, some pixels drawn and some not, between where it is solid and where nothing is
  const ring = rows.slice(6, 10).join(""), drawn = ring.replace(/\./g, "").length;
  assert.ok(drawn > 0 && drawn < ring.length, "thin at its rim");
  const b = p.image("b");
  assert.ok(b.emit && b.emit.some((v) => v > 0), "what glows marks the picture");
  assert.match(keys(p, "b"), /w/);
  const e = (() => { try { loadSource(PAL + `sprite("x", { w: 8, h: 8 }, volume(sdf.sphere(1)))`, "t.px.js").image("x"); } catch (err) { return err as Error; } })();
  assert.match(String(e?.message), /draws a density.*not a distance/);
});

test("volume() through a camera after a mesh(): a wall hides it, it lies over what is behind, its shadow and its glow on the ground", () => {
  const scene = (o: string, wall = false) => keys(loadSource(PAL + `ramps("kgw", "krr")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }, M = model()
M.face("g", [-5, 0.5, 0], [5, 0.5, 0], [5, 20, 0], [-5, 20, 0])
${wall ? `M.box("s", [-1, 3, 0], [1, 3.1, 0.8])` : ""}
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { g: { ramp: "g" }, s: { ramp: "r" } }),
  (c) => c.volume(sdf.density(sdf.sphere(0.35), { edge: 0.35 }), { view: V, at: [0, 4, 0.5], ramp: "kw", light: [-1, 0, 1], thickness: 6, ${o} }))`, "t.px.js"), "a").split("\n");
  const plain = scene(""), walled = scene("", true);
  // the ball, 0.5 m up at z 4 (row 15): over the ground behind it; the wall (its top 0.8 m up, row ~12) in front hides it
  assert.ok(/[kw]/.test(plain[15].slice(17, 23)), "over what is behind");
  assert.ok(!/[kw]/.test(walled[15].slice(17, 23)), "the wall hides it");
  const lit = scene("emit: { ramp: \"w\", glow: 2 }"), shade = scene("cast: 1");
  assert.ok(lit.slice(16).join("").includes("w"), "its glow steps the ground up its ramp");
  assert.ok(shade.slice(16).join("").includes("k"), "its shadow steps the ground down");
  assert.ok(!plain.slice(18).join("").replace(/g/g, "").length, "neither without them");
});
