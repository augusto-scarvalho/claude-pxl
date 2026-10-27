// Phase 6 of the 3D DSL: details scattered on a form (sdf.scatter, brushes), decals pinned and wrapped
// on it (decal), the builders (make3d), a scene as data with named parts and relations (world3d), local
// edits that leave the rest byte for byte as it was, what painted a pixel (Img.parts), expect3d's rules.
import assert from "node:assert/strict";
import { sdf } from "../src/core/sdf.ts";
import { scatter } from "../src/core/scatter.ts";
import { World, fixRule, runExpects, setKnobInSource } from "../src/core/world3d.ts";
import { make3d } from "../src/core/builders.ts";
import { loadSource } from "../src/node/load.ts";
import { Project } from "../src/core/project.ts";
import { checkProject } from "../src/node/check.ts";
import { keys, PAL } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/world.test.ts");

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
  // stamped (flipped too) into a scene, it still says what painted each pixel; a stamp over it covers that
  const q = loadSource(FACE + `const B = sdf.sphere(0.5).at(0, 0, 0.5)
sprite("ball", { w: 30, h: 30 }, surface(B, { ppm: 24, at: [15, 27], mats: { m: "kgw" }, part: "ball" }))
sprite("dot", "k")
scene("s", { w: 64, h: 32 }, stamp("ball", 0, 0), stamp("ball", 32, 0, { flip: "x" }), stamp("dot", 15, 15))`, "t.px.js").image("s");
  const at = (x: number, y: number) => q.parts!.names[q.parts!.ids[y * 64 + x]];
  assert.deepEqual([at(15, 20), at(47, 20), at(15, 15)], ["ball", "ball", undefined]);
  // on the voxels or the mesh made of a field: the field is what it lies on
  const vm = loadSource(FACE + `const B = sdf.sphere(0.5).at(0, 0, 0.5).mat("m"), V = { kind: "side", pitch: 0 }, E = { on: B, point: [0, -0.5, 0.5], ppm: 24, view: V, at: [15, 27] }
sprite("vox", { w: 30, h: 30 }, voxels(B, { size: 0.125, view: V, ppm: 24, at: [15, 27], mats: { m: "kgw" } }), decal("eye", E))
sprite("msh", { w: 30, h: 30 }, mesh(V, sdf.mesh(B, { size: 0.1 }).faces, { m: { ramp: "kgw" } }, { ppm: 24, at: [15, 27] }), decal("eye", E))`, "t.px.js");
  for (const n of ["vox", "msh"]) assert.equal((keys(vm, n).match(/r/g) ?? []).length, 4, n);
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
  // a row along a path, straight on past its ends; a rock kept clear of the house by placing, the shorter way
  const R = new World({ parts: { house: { make: "house", at: [2, 1] },
    p0: { make: "rock", along: [[[0, 0], [2, 0], [2, 2]], 1] }, p1: { make: "rock", along: [[[0, 0], [2, 0], [2, 2]], 3] }, p2: { make: "rock", along: [[[0, 0], [2, 0], [2, 2]], 5] },
    r: { make: "rock", at: [2.3, 1.2], apart: ["house", 0.2] }, far: { make: "rock", at: [9, 9], apart: ["house"] } } });
  assert.deepEqual([R.place("p0"), R.place("p1"), R.place("p2")], [[1, 0, 0], [2, 1, 0], [2, 3, 0]]);
  const [hlo, hhi] = R.box("house"), [rlo, rhi] = R.box("r"), r = R.place("r");
  assert.ok(r[0] + rlo[0] >= 2 + hhi[0] + 0.2 - 1e-9 || r[1] + rlo[1] >= 1 + hhi[1] + 0.2 - 1e-9 || r[0] + rhi[0] <= 2 + hlo[0] - 0.2 + 1e-9 || r[1] + rhi[1] <= 1 + hlo[1] - 0.2 + 1e-9, `clear of the house: ${r}`);
  assert.deepEqual(R.place("far"), [9, 9, 0], "already clear: where it was put");
  assert.throws(() => new World({ parts: { a: { make: "rock", along: [[[0, 0]], 1] } } }), /two points or more/);
  assert.notEqual(make3d.tree({ seed: 1 }).field!.dist([0, 0, 3]), make3d.tree({ seed: 2 }).field!.dist([0, 0, 3]));
  // a guess out of range said, not drawn (an agent once gave twist 70, radians wrapping round)
  assert.throws(() => make3d.tree({ twist: 70 }), /twist is 0 to 1\.5 \(default 0\.35\), got 70/);
  // a pine of tiers (snow on them), a bush; both swaying in the world's wind
  const pine = make3d.pine({ height: 5, snow: 0.5 }), bush = make3d.bush({ leaves: 20 });
  assert.deepEqual([Object.keys(pine.parts), Object.keys(pine.details), pine.sockets.top], [["trunk", "crown"], ["snow"], [0, 0, 5]]);
  assert.ok(pine.field!.dist([0, 0, 4.5]) < 0 && pine.field!.dist([0, 0, 5.5]) > 0 && bush.field!.dist([0, 0, 0.4]) < 0);
  assert.throws(() => make3d.pine({ tiers: 40 }), /tiers is 1 to 10/);
  const P = new World({ wind: { from: "left" }, parts: { p: { make: "pine" } } }), Q = P.edit({ "wind.from": "right" });
  assert.ok(P.changed(Q).includes("p"), "the pine sways with the world's wind");
});

test("make3d.define: a builder of the file's own in its worlds, its ranges refused (and so bounding --fix), swaying in the wind; a part's own mats and look", () => {
  const src = PAL + `ramps("kgw", "krr")
make3d.define("post", ({ tall = 1 }) => ({ field: sdf.box([0.2, 0.2, tall]).at(0, 0, tall / 2).mat("wood"), sockets: { top: [0, 0, tall] } }), { params: { tall: [0.5, 3] } })
make3d.define("puff", () => ({ density: sdf.density(sdf.sphere(0.4), { edge: 0.2 }) }))
const W = world3d({ parts: { a: { make: "post", params: { tall: 2 } }, b: { make: "post", at: [1, 0], mats: { wood: "kgw" } }, c: { make: "puff", attach: ["a", "top"], look: { ramp: "kgw", thickness: 2 } } } })
sprite("s", { w: 40, h: 40 }, draw3d(W, { view: { kind: "side", origin: [14, 38] }, ppm: 8, mats: { wood: "krr" } }))`;
  const rows = keys(loadSource(src, "t.px.js"), "s").split("\n");
  assert.equal(rows[32].slice(13, 23), "rk......wk", "a's wood in draw3d's ramp, b's in its own");
  assert.equal(rows[22].slice(12, 16), "wwww", "the puff at a's top, in its look");
  const env = new Project().env() as { make3d: Record<string, (...a: unknown[]) => unknown>; world3d: (s: unknown) => World };
  env.make3d.define("post", ({ tall = 1, wind = [0, 0] }: { tall?: number; wind?: number[] }) => ({ field: sdf.box([0.2, 0.2, tall]).at(wind[0], 0, 0) }), { params: { tall: [0.5, 3] }, wind: true });
  const w = env.world3d({ wind: { from: "right", strength: 0.3 }, parts: { a: { make: "post", params: { tall: 2 } } } });
  assert.ok(w.built("a").field!.dist([-0.3, 0, 0]) < 0 && w.built("a").field!.dist([0, 0, 0]) > 0, "the world's wind given to what sways (0.3 m to the left)");
  assert.throws(() => w.edit({ "a.tall": 9 }).built("a"), /make3d\.post: tall is 0\.5 to 3, got 9/);
  assert.throws(() => env.make3d.post({ hight: 2 }), /no parameter hight/);
  assert.throws(() => env.make3d.define("tree", () => ({})), /built in/);
  env.make3d.define("bad", () => ({ nothing: 1 }));
  assert.throws(() => env.make3d.bad(), /returns \{ field: an sdf \} or \{ density/);
});

test("make3d.define: a parameter that is a word, its words declared beside the ranges; another refused", () => {
  const env = new Project().env() as { make3d: Record<string, (...a: unknown[]) => { field?: unknown }> };
  env.make3d.define("lamp", ({ size = 1, season = "summer" }: { size?: number; season?: string }) => ({ field: sdf.sphere(season === "bare" ? size / 2 : size) }), { params: { size: [0.5, 2], season: ["summer", "bare"] } });
  assert.ok(env.make3d.lamp({ season: "bare", size: 2 }).field);
  assert.throws(() => env.make3d.lamp({ season: "autumn" }), /make3d\.lamp: season is "summer", "bare", got "autumn"/);
  assert.throws(() => env.make3d.lamp({ colour: 1 }), /no parameter colour/);
  assert.throws(() => env.make3d.define("odd", () => ({}), { params: { season: ["summer", 2] } }), /the words it takes/);
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

test("expect3d in time (before, while); a failing rule fixed by one number, no model; written into the file", () => {
  // a rock rolling right over the loop: at x 0, 1, 2, 3 m
  const W = new World({ parts: { a: { make: "rock", params: { size: 0.3 }, at: (c) => [4 * c.phase, 0, 0] }, b: { make: "rock", params: { size: 0.3 }, at: [3, 0] } } });
  const ok = (rules: object[]) => runExpects(W, rules as never, 4, 3600).map((r) => r.ok);
  const left = { within: ["a", [[-1, -1, -1], [1.5, 1, 1]]] }, right = { within: ["a", [[1.5, -1, -1], [5, 1, 1]]] };
  assert.deepEqual(ok([{ before: [left, right] }, { before: [right, left] }, { while: [{ near: ["a", "b", 1.2] }, right] }, { while: [{ near: ["a", "b", 0.5] }, right] }]), [true, false, true, false]);
  // apart fails: the rock's gap fixed (the smallest change, a round number), the other rule kept
  const V = new World({ parts: { h: { make: "house", at: [0, 0] }, r: { make: "rock", beside: ["h", "front", -1.2] } } });
  const rules = [{ apart: ["r", "h"] }, { on: ["h", "ground"] }] as never[];
  const f = fixRule(V, rules, rules[0], 2)!;
  assert.deepEqual([f.knob.part, f.knob.key, f.knob.value], ["r", "beside", -1.2]);
  assert.ok(f.to > -1.2 && f.to < 0, String(f.to));
  assert.equal(setKnobInSource(`const V = world3d({ parts: {\n  h: { make: "house", at: [0, 0] },\n  r: { make: "rock", beside: ["h", "front", -1.2] } } })`, f.knob, f.to)!.split("\n")[2], `  r: { make: "rock", beside: ["h", "front", ${f.to}] } } })`);
  assert.equal(setKnobInSource(`a: { at: [1, 2] }`, { part: "a", key: "at", i: 2, value: 0 }, 0.5), `a: { at: [1, 2, 0.5] }`);
});

test("draw3d as: a field or a built thing drawn as its surface, voxels, splats or a mesh (in the depth drawn, its shadow the field's); a part's own, edited alone", () => {
  const base = PAL + `ramps("kgw", "krr")
const C = perspective({ w: 48, h: 40, pitch: -40, fov: 30, ppm: 16 }), G = model(), F = sdf.box([0.8, 0.8, 1]).at(0, 0, 0.5).mat("m")
G.face("g", [-4, C.z - 4, 0], [4, C.z - 4, 0], [4, C.z + 4, 0], [-4, C.z + 4, 0])
const draw = (o) => (c) => { c.mesh(C, G.faces, { g: { ramp: "w" } }, { light: [-1, -0.5, 1] }); c.draw3d(F, { view: C, at: C.aim(0.5), mats: { m: "kgw" }, light: [-1, -0.5, 1], ...o }) }
`;
  const p = loadSource(base + `for (const as of ["surface", "voxels", "splats", "mesh"]) sprite(as, { w: 48, h: 40 }, draw({ as, size: 0.2, spacing: 0.1 }))
sprite("hand", { w: 48, h: 40 }, (c) => { c.mesh(C, G.faces, { g: { ramp: "w" } }, { light: [-1, -0.5, 1] }); c.surface(F, { view: C, at: C.aim(0.5), mats: { m: "kgw" }, light: [-1, -0.5, 1] }) })`, "t.px.js");
  assert.equal(p.image("surface").hash(), p.image("hand").hash(), "as surface: surface()'s");
  const R = Object.fromEntries(["surface", "voxels", "splats", "mesh"].map((a) => [a, keys(p, a).split("\n")]));
  for (const a of ["voxels", "splats", "mesh"]) {
    assert.notEqual(R[a].join(), R.surface.join(), a);
    assert.ok(R[a].some((r) => /[kgr]/.test(r)), `${a} drawn`);
    // its shadow on the ground (a step down the ground's ramp, to the right of it: the light from the left)
    assert.ok(R[a].some((r) => r.slice(30).includes("g")) || R[a].some((r) => /[^w.]/.test(r.slice(30))), `${a}'s shadow`);
  }
  assert.throws(() => loadSource(base + `sprite("x", { w: 8, h: 8 }, draw({ as: "cubes" }))`, "t.px.js").image("x"), /as is "surface", "voxels", "splats", "mesh"/);
  // a world's part drawn its own way; edited, the other part and the world's data alone stay as they were
  const W = new World({ parts: { oak: { make: "tree", at: [-1, 0] }, rock: { make: "rock", at: [1.2, 0] } } }), W2 = W.edit({ "oak.as": "voxels" });
  assert.deepEqual(W2.changed(W), ["oak.as"]);
  assert.equal(W2.spec.parts.oak.as, "voxels"); assert.equal(W2.spec.parts.oak.params?.as, undefined, "not a builder's parameter");
  assert.throws(() => new World({ parts: { a: { make: "rock", as: "cubes" } } }), /drawn as "surface"/);
});
