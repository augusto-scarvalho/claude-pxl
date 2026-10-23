// Phase 6 of the 3D DSL: details scattered on a form (sdf.scatter, brushes), decals pinned and wrapped
// on it (decal), the builders (make3d), a scene as data with named parts and relations (world3d), local
// edits that leave the rest byte for byte as it was, what painted a pixel (Img.parts), expect3d's rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sdf } from "../src/core/sdf.ts";
import { scatter } from "../src/core/scatter.ts";
import { World, runExpects } from "../src/core/world3d.ts";
import { make3d } from "../src/core/builders.ts";
import { loadSource } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";
import { keys, PAL } from "./helpers.ts";

test("scatter: on a material, facing up, where asked, seeded; carried by the form's bend, fluttering", () => {
  const f = sdf.sphere(1).at(0, 0, 1).mat("stone").paint("cap", (p) => p[2] > 1.4);
  const all = scatter(f, { count: 40, seed: 2 }), caps = scatter(f, { count: 40, on: "cap", seed: 2 }), up = scatter(f, { count: 40, up: 0.8, seed: 2 });
  assert.ok(all.n > 300 && caps.n > 10 && caps.n < all.n / 3, `${all.n} ${caps.n}`);
  for (let i = 0; i < up.n; i++) assert.ok(up.normal[i * 3 + 2] >= 0.8, "facing up");
  assert.equal(scatter(f, { count: 40, seed: 2 }).pos.join(), all.pos.join(), "the same seed, the same");
  assert.deepEqual(caps.mats, ["cap"]); assert.equal(scatter(f, { count: 40, on: "cap", mat: "snow" }).mats[0], "snow");
  const bent = scatter(sdf.capsule([0, 0, 0], [0, 0, 2], 0.2).bend((c) => c.phase), { count: 30 }), k = [...Array(bent.n).keys()].find((i) => bent.pos[i * 3 + 2] > 1)!;
  const p = [bent.pos[k * 3], bent.pos[k * 3 + 1], bent.pos[k * 3 + 2]] as [number, number, number], at = (ph: number) => bent.move!({ t: 0, phase: ph, frame: 0, frames: 1 })(k, p);
  assert.ok(Math.abs(at(0.5)[0] - (p[0] + 0.5 * (p[2] * p[2]) / 2)) < 1e-9, "carried by the bend");
  assert.throws(() => scatter(f, { brush: "fern" as never }), /brush ellipse, dot, clump, leaf, blade, cluster/);
});

const STAGE = PAL + `ramps("kgw", "krr")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }
`;
test("brushes: a detail smaller than a few px drawn as a pixel-art cluster at its depth, in its ramp", () => {
  const rows = keys(loadSource(STAGE + `const F = sdf.box([2, 2, 0.2]).at(0, 0, 0.1).mat("m")
sprite("a", { w: 40, h: 30 }, surface(F, { view: "top", ppm: 16, at: [20, 15], mats: { m: "kgw" } }), splats(sdf.scatter(F, { count: 6, up: 0.9, brush: "clump", mat: "r", vary: 0 }), { view: "top", ppm: 16, at: [20, 15], mats: { r: "krr" } }))`, "t.px.js"), "a");
  assert.ok((rows.match(/r/g) ?? []).length > 20, rows);
  assert.match(rows, /rr\n[^\n]*rr|r{2,}/, "clusters, not lone pixels");
});

const FACE = PAL + `ramps("kgw")
sprite("eye", { pivot: "center" }, "rr\\nrr")
sprite("eye3", { pivot: "center" }, "r.\\nr.")
`;
test("decals: pinned a texel to a pixel, hidden turned away, the view picked by the angle and mirrored; wrapped on the surface; glowing", () => {
  // the eye where the ball's surface turns deg degrees round from the front (180: its back)
  const draw = (deg: number, extra = "") => loadSource(FACE + `const B = sdf.sphere(0.5).at(0, 0, 0.5), a = ${deg} * Math.PI / 180
sprite("a", { w: 30, h: 30 }, surface(B, { ppm: 24, view: { kind: "side", pitch: 0 }, at: [15, 27], mats: { m: "kgw" } }), decal("eye", { on: B, point: [0.5 * Math.sin(a), -0.5 * Math.cos(a), 0.5], views: { three: "eye3" }, ppm: 24, view: { kind: "side", pitch: 0 }, at: [15, 27]${extra} }))`, "t.px.js");
  const front = keys(draw(0), "a"), away = keys(draw(180), "a"), turned = keys(draw(40), "a"), other = keys(draw(-40), "a");
  assert.equal((front.match(/r/g) ?? []).length, 4, "a 2x2 texel block, crisp");
  assert.equal((away.match(/r/g) ?? []).length, 0, "turned away: gone");
  assert.equal((turned.match(/r/g) ?? []).length, 2, "three quarters: its own grid");
  const col = (s: string) => s.split("\n").find((r) => r.includes("r"))!.indexOf("r");
  assert.ok(col(turned) !== col(other), "the other side mirrored and moved");
  const p = draw(0, ", lit: false");
  assert.ok(p.image("a").emit?.some((v) => v), "unlit: glowing");
  assert.equal(p.image("a").parts!.names.includes("decal eye"), true, "what painted it");
  const wrap = keys(loadSource(FACE + `const C = sdf.cylinder(0.5, 1)
sprite("a", { w: 40, h: 40 }, surface(C, { ppm: 24, view: { kind: "side", pitch: 0 }, at: [20, 36], mats: { m: "kgw" } }), decal("eye", { on: C, point: [0, -0.5, 0.5], mode: "wrap", size: 0.4, ppm: 24, view: { kind: "side", pitch: 0 }, at: [20, 36] }))`, "t.px.js"), "a");
  assert.ok((wrap.match(/r/g) ?? []).length >= 60, "wrapped 0.4 m across, no holes");
});

test("world3d: parts placed by relations, a seed each; an edit changes only what it names and what hangs on it, the rest byte for byte", () => {
  const W = new World({ seed: 4, wind: { from: "right" }, parts: {
    oak: { make: "tree", at: [-2, 0] }, house: { make: "house", at: [2, 1] }, smoke: { make: "smoke", attach: ["house", "chimney"] },
    rock: { make: "rock", beside: ["house", "front", 0.5] }, mist: { make: "mist", around: "house" },
  } });
  assert.deepEqual(W.place("smoke"), [2.45, 1.35, 2.48]);
  assert.ok(W.place("rock")[1] < 1 - 0.5 - 0.8, "in front of the house");
  assert.deepEqual(W.place("mist").slice(0, 2), [2, 1]);
  const E = W.edit({ "oak.canopy": 1.6, "oak.twist": 0.8, "wind.from": "left", "mist.color": "blue" });
  const ch = W.changed(E);
  for (const k of ["oak", "oak.canopy", "oak.branches", "smoke", "mist"]) assert.ok(ch.includes(k), `${k} changed: ${ch}`);
  for (const k of ["oak.trunk", "house", "house.stem", "house.cap", "rock", "rock.stone", "house@", "rock@", "smoke@"]) assert.ok(!ch.includes(k), `${k} stays: ${ch}`);
  assert.throws(() => W.edit({ "pine.canopy": 2 }), /no part 'pine'/);
  assert.throws(() => new World({ parts: { a: { make: "tree", on: "b" } } }), /refers to 'b'/);
  assert.notEqual(make3d.tree({ seed: 1 }).field!.dist([0, 0, 3]), make3d.tree({ seed: 2 }).field!.dist([0, 0, 3]));
  // a guess out of range said, not drawn (an agent once gave twist 70, radians wrapping round)
  assert.throws(() => make3d.tree({ twist: 70 }), /twist is 0 to 1\.5 \(default 0\.35\), got 70/);
});

test("draw3d: the parts an edit leaves alone drawn the same, byte for byte; each pixel knows its part; expect3d's rules in pxl check", () => {
  const src = (wind: string, canopy: number, only: string) => PAL + `ramps("kgw", "krr")
const MATS = { bark: "krr", leaf: "kgw", stone: "kgw", moss: "kgw", stem: "kgw", door: "krr", glow: "krr", cap: "krr", spot: "kgw", gem: "kgw", mist_grey: "kgw", smoke_grey: "kgw" }
const W = world3d({ seed: 4, wind: { from: "${wind}" }, parts: { oak: { make: "tree", at: [-1.4, 0], params: { canopy: ${canopy} } }, rock: { make: "rock", at: [1.2, 0] } } })
sprite("a", { w: 60, h: 50 }, draw3d(W, { view: { kind: "side", origin: [30, 48] }, ppm: 8, mats: MATS${only ? `, only: ["${only}"]` : ""} }))
expect3d("w", W, [{ above: ["oak.canopy", "oak.trunk"] }, { on: ["rock", "ground"] }, { above: ["rock", "oak.canopy"] }], { frames: 2 })`;
  const a = loadSource(src("right", 1, "rock"), "t.px.js").image("a"), b = loadSource(src("left", 1.6, "rock"), "t.px.js").image("a");
  assert.equal(a.hash(), b.hash(), "the rock as it was");
  assert.notEqual(loadSource(src("right", 1, "oak"), "t.px.js").image("a").hash(), loadSource(src("left", 1.6, "oak"), "t.px.js").image("a").hash());
  const p = loadSource(src("right", 1, ""), "t.px.js"), img = p.image("a"), P = img.parts!;
  const named = new Set([...P.ids].filter((v) => v >= 0).map((v) => P.names[v]));
  for (const n of ["oak.canopy", "oak.trunk", "rock.stone"]) assert.ok(named.has(n), `${n}: ${[...named]}`);
  const r = checkProject(p, { file: "t.px.js" });
  assert.equal(r.lines.length, 1, r.lines.join("\n"));
  assert.match(r.lines[0], /expect rock above oak\.canopy: it doesn't hold \(at frame 0 its middle is/);
  assert.match(r.coverage, /expects 3 \(2 held\)/);
  // a part that moves, reaching a point in time
  const orb = new World({ parts: { o: { make: "rock", params: { size: 0.3 }, at: (c) => [4 * c.phase, 0, 0] } } });
  assert.deepEqual(runExpects(orb, [{ reaches: ["o", [2, 0, 0.15], 2000, 0.4] }, { reaches: ["o", [3.5, 0, 0.15], 1000, 0.3] }], 8, 3600).map((x) => x.ok), [true, false]);
});
