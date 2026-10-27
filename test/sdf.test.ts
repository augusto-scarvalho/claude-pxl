// Fields in 3D (sdf.ts): distances that are right, the same field the same at the same moment, every
// point inside within the bounds a renderer clips to, the four kinds kept apart; and surface(), the
// field drawn as pixel art: what is inside opaque, outlined away from the light, the normals, the
// views, and through a camera at mesh()'s depth with its shadow on the ground.
import assert from "node:assert/strict";
import { Sdf, compile, fbm3, sdf } from "../src/core/sdf.ts";
import { surfaceSize } from "../src/core/surface.ts";
import { loadSource } from "../src/node/load.ts";
import { failure, keys, PAL } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/sdf.test.ts");

const near = (a: number, b: number, e = 1e-9, what = "") => assert.ok(Math.abs(a - b) <= e, `${what} ${a} != ${b}`);
const D = (f: Sdf, p: number[], clock?: Parameters<Sdf["dist"]>[1]) => f.dist(p, clock);

test("sdf: the primitives' distances", () => {
  near(D(sdf.sphere(1), [3, 0, 0]), 2); near(D(sdf.sphere(1), [0, 0, 0]), -1);
  const b = sdf.box([2, 4, 6]);
  near(D(b, [3, 0, 0]), 2); near(D(b, [0, 0, 0]), -1); near(D(b, [2, 3, 4]), Math.sqrt(3), 1e-9, "corner");
  near(D(sdf.box([2, 2, 2], { round: 0.5 }), [2, 2, 0]), Math.hypot(1.5, 1.5) - 0.5, 1e-9, "a rounded edge");
  near(D(sdf.capsule([0, 0, 0], [0, 0, 2], 0.5), [1, 0, 1]), 0.5); near(D(sdf.capsule([0, 0, 0], [0, 0, 2], 0.5), [0, 0, 3]), 0.5);
  near(D(sdf.capsule([0, 0, 0], [0, 0, 2], 0.5, 0.1), [0, 0, 2.1]), 0, 1e-9, "tapered tip");
  near(D(sdf.cylinder(1, 2), [3, 0, 1]), 2); near(D(sdf.cylinder(1, 2), [0, 0, 3]), 1); near(D(sdf.cylinder(1, 2), [0, 0, -0.5]), 0.5);
  near(D(sdf.cone(1, 2), [0, 0, 2]), 0, 1e-9, "the tip"); near(D(sdf.cone(1, 2), [0, 0, -1]), 1, 1e-9, "under the foot");
  near(D(sdf.cone(1, 2), [1, 0, 0]), 0, 1e-9, "the foot's rim"); assert.ok(D(sdf.cone(1, 2), [0.4, 0, 1]) < 0);
  near(D(sdf.torus(2, 0.5), [2, 0, 0]), -0.5); near(D(sdf.torus(2, 0.5), [0, 0, 0]), 1.5);
  near(D(sdf.plane(), [5, 5, 2]), 2); near(D(sdf.plane([1, 0, 0], 1), [3, 0, 0]), 2);
  const e = sdf.ellipsoid([2, 1, 1]);
  near(D(e, [2, 0, 0]), 0, 1e-9); near(D(e, [0, 1, 0]), 0, 1e-9); assert.ok(D(e, [0, 0, 0]) < 0 && D(e, [3, 0, 0]) > 0.5);
});

test("sdf: joins plain and smooth, moves and deformations", () => {
  const a = sdf.sphere(1), b = sdf.sphere(1).at(3, 0, 0);
  near(D(a.union(b), [1.5, 0, 0]), 0.5); near(D(sdf.union(a, b), [-2, 0, 0]), 1);
  // smooth: never farther than the plain union, the same far from where they meet
  const s = a.union(b, { smooth: 1 });
  assert.ok(D(s, [1.5, 0, 0]) < 0.5); near(D(s, [-2, 0, 0]), 1);
  near(D(a.subtract(sdf.sphere(1).at(1, 0, 0)), [-0.5, 0, 0]), -0.5); assert.ok(D(a.subtract(sdf.sphere(1).at(1, 0, 0)), [0.5, 0, 0]) > 0, "cut out");
  near(D(a.intersect(sdf.sphere(1).at(1, 0, 0)), [0.5, 0, 0]), -0.5); assert.ok(D(a.intersect(sdf.sphere(1).at(1, 0, 0)), [-0.9, 0, 0]) > 0);
  near(D(a.at(1, 2, 3), [1, 2, 3]), -1); near(D(a.at([1, 2, 3]), [1, 2, 5]), 1);
  // a box 4 long on x, turned 90 degrees about the upright, lies along y
  const bar = sdf.box([4, 1, 1]).rotate(90);
  near(D(bar, [0, 1.9, 0]), -0.1, 1e-9); near(D(bar, [1.9, 0, 0]), 1.4, 1e-9);
  near(D(a.scale(2), [3, 0, 0]), 1); assert.ok(D(a.scale([2, 1, 1]), [1.9, 0, 0]) < 0);
  near(D(a.at(2, 0, 0).mirror("x"), [-2, 0, 0]), -1);
  near(D(a.repeat([3, 0, 0], 2), [6, 0, 0]), -1); assert.ok(D(a.repeat([3, 0, 0], 2), [9, 0, 0]) > 1.9, "only count copies each way");
  // a rod bent by k: its axis a point z up sits k z^2 / 2 along x
  const rod = sdf.capsule([0, 0, 0], [0, 0, 2], 0.1).bend(0.5);
  near(D(rod, [0.5 * 0.5 * 1.5 ** 2, 0, 1.5]), -0.1); assert.ok(D(rod, [0, 0, 1.5]) > 0.3);
  // a bar twisted 90 degrees a meter: at 1 m up it lies along y
  const tw = sdf.box([2, 0.2, 2]).at(0, 0, 1).twist(90);
  assert.ok(D(tw, [0, 0.9, 1]) < 0 && D(tw, [0.9, 0, 1]) > 0); assert.ok(D(tw, [0.9, 0, 0.01]) < 0);
});

test("sdf: noise is seeded, bounded by its amplitude, the same at the same point; a parameter reads the clock", () => {
  const n = (seed: number) => sdf.sphere(1).noise({ amp: 0.2, scale: 0.3, seed });
  const pts = Array.from({ length: 50 }, (_, i) => [Math.sin(i) * 1.5, Math.cos(i * 1.3), Math.sin(i * 0.7)]);
  const v1 = pts.map((p) => D(n(3), p)), v2 = pts.map((p) => D(n(3), p)), v3 = pts.map((p) => D(n(4), p));
  assert.deepEqual(v1, v2, "the same seed, the same field");
  assert.notDeepEqual(v1, v3, "another seed, another");
  pts.forEach((p, i) => assert.ok(Math.abs(v1[i] - D(sdf.sphere(1), p)) <= 0.2 + 1e-9));
  assert.ok(fbm3(0.3, 0.7, 0.1, 9) >= 0 && fbm3(0.3, 0.7, 0.1, 9) <= 1);
  const sway = sdf.sphere(1).at((c) => [Math.sin(2 * Math.PI * c.phase), 0, 0]);
  near(D(sway, [1, 0, 0], { t: 0, phase: 0.25, frame: 1, frames: 4 }), -1, 1e-9);
  near(D(sway, [1, 0, 0], { t: 0, phase: 0, frame: 0, frames: 4 }), 0, 1e-9);
});

test("sdf: a union of hundreds written in runs of code, passed over a group at a time, the same steps to the bit, a point's material from the nearest child; noise's tables the same in any order", () => {
  const balls = Array.from({ length: 400 }, (_, i) => [Math.sin(i) * 3, Math.cos(i * 1.3) * 3, Math.sin(i * 0.7) * 3, 0.2 + 0.1 * Math.abs(Math.sin(i * 2.1))]);
  const C = compile(sdf.union(balls.map(([x, y, z, r]) => sdf.sphere(r).at(x, y, z))));
  assert.match(C.key, /const s0 = /, "in runs");
  // the union's steps by hand: the first ball, then each one whose box isn't farther than the best so far
  const byHand = (x: number, y: number, z: number) => balls.reduce((u, [bx, by, bz, r], i) => {
    const a = x - bx, b = y - by, c = z - bz, v = Math.sqrt(a * a + b * b + c * c) - r;
    const ex = Math.max(bx - r - x, 0, x - (bx + r)), ey = Math.max(by - r - y, 0, y - (by + r)), ez = Math.max(bz - r - z, 0, z - (bz + r)), lim = u + 0;
    return i === 0 ? v : lim < 0 || (ex * ex + ey * ey + ez * ez) * 1 * 1 >= lim * lim ? u : Math.min(u, v);
  }, NaN);
  let s = 5;
  const rand = () => { s = (s * 16807) % 2147483647; return (s / 2147483647) * 8 - 4; };
  for (let n = 0; n < 400; n++) { const p = [rand(), rand(), rand()]; assert.equal(C.d(p[0], p[1], p[2]), byHand(p[0], p[1], p[2]), `at ${p}`); }
  // a point's material from the nearest child, the groups the same in the pass that tracks it (more lines)
  const kids = Array.from({ length: 60 }, (_, i) => sdf.union(sdf.sphere(0.3).at(Math.sin(i) * 3, Math.cos(i * 1.3) * 3, 0), sdf.sphere(0.2).at(Math.sin(i) * 3, Math.cos(i * 1.3) * 3, 0.3), sdf.sphere(0.1).at(Math.sin(i) * 3, Math.cos(i * 1.3) * 3, 0.5)).mat(["a", "b", "c"][i % 3]));
  const M = compile(sdf.union(kids)), each = kids.map((f) => compile(f));
  for (let n = 0, hit = 0; hit < 100 && n < 1e5; n++) {
    const p = [rand(), rand(), rand() / 8], ds = each.map((C) => C.d(p[0], p[1], p[2])), i = ds.indexOf(Math.min(...ds));
    if (!(ds[i] > 0 && ds[i] < 0.05)) continue;
    hit++;
    assert.equal(M.mats[M.m(p[0], p[1], p[2], 0, 0, 1)], ["a", "b", "c"][i % 3], `at ${p}`);
  }
  const v = (seed: number) => fbm3(0.37, 1.2, 2.9, seed, 3), first = [5, 6, 7].map(v);
  assert.deepEqual([7, 5, 6, 5, 7, 6].map(v), [first[2], first[0], first[1], first[0], first[2], first[1]]);
});

test("sdf: a point's material and part, from the child its distance takes at each join (one pass of code)", () => {
  const r = (10 * Math.PI) / 180, B = [3 * Math.cos(r), 3 * Math.sin(r), 0], Cc = [3 * Math.cos(r) - 3 * Math.sin(r), 3 * Math.sin(r) + 3 * Math.cos(r), 0];
  const f = sdf.union(sdf.sphere(1).mat("a").part("left"), sdf.union(sdf.sphere(1).at(3, 0, 0).mat("b"), sdf.sphere(1).at(3, 3, 0).mat("c")).rotate(10).part("right"), { smooth: 0.2 })
    .intersect(sdf.plane([0, 0, -1], 0.5)).paint("top", (p, n) => n[2] > 0.9);
  const C = compile(f), at = (p: number[], n = [1, 0, 0]) => [C.mats[C.m(p[0], p[1], p[2], n[0], n[1], n[2])] ?? null, C.parts[C.part(p[0], p[1], p[2], n[0], n[1], n[2])] ?? null];
  assert.deepEqual(at([-1, 0, 0]), ["a", "left"]);
  assert.deepEqual(at([B[0] + 1, B[1], 0]), ["b", "right"]);
  assert.deepEqual(at([Cc[0], Cc[1] + 1, 0]), ["c", "right"]);
  assert.deepEqual(at([0, 0, 1], [0, 0, 1]), ["top", "left"], "painted over it all");
  assert.deepEqual(at([0, 0, -3]), [null, null], "below the plane the intersection takes it: nothing");
  assert.equal(C.mp(-1, 0, 0, 1, 0, 0), C.m(-1, 0, 0, 1, 0, 0) + 1 + 1024 * (C.part(-1, 0, 0, 1, 0, 0) + 1));
});

test("sdf: compiled once a moment (drawn, then a decal laid on it): at another moment its own numbers", () => {
  const f = sdf.sphere(1).at((c) => [c.phase, 0, 0]), A = { t: 0, phase: 0.25, frame: 1, frames: 4 }, B = { t: 0, phase: 0.5, frame: 2, frames: 4 };
  const a = compile(f, A);
  assert.equal(compile(f, { ...A }), a);
  assert.equal(compile(f, B).d(0.5, 0, 0), -1);
  assert.equal(compile(f, A).d(0.25, 0, 0), -1);
  // (a paint() function that named a material since: compiled afresh, as before)
  const g = sdf.sphere(1).paint(() => "late"), c1 = compile(g);
  c1.m(1, 0, 0, 1, 0, 0);
  assert.notEqual(compile(g), c1);
});

test("sdf: whatever is inside lies within the bounds; distances stretch no more than lip", () => {
  const leaf = sdf.ellipsoid([0.6, 0.5, 0.4]).noise({ amp: 0.1, scale: 0.25, seed: 2 });
  const fields: Sdf[] = [
    sdf.sphere(0.5).union(sdf.box([0.4, 0.4, 1]).at(0.6, 0, 0), { smooth: 0.3 }),
    sdf.capsule([0, 0, 0], [0.3, 0.2, 1.4], 0.2, 0.05).rotate(35, [1, 1, 0]).at(0.2, -0.1, 0),
    sdf.box([1, 0.3, 1]).twist(120).bend([0.4, -0.2]),
    leaf.repeat([1.3, 0, 0], 1).mirror("y"),
    sdf.cone(0.6, 1.2, 0.1).intersect(sdf.sphere(0.9)).subtract(sdf.cylinder(0.2, 2)),
    sdf.torus(0.6, 0.15).rotate(60, "x").scale([1, 1.5, 0.8]),
  ];
  for (const [k, f] of fields.entries()) {
    const C = compile(f), [lo, hi] = [C.lo, C.hi];
    let r = 7 + k, inside = 0;
    const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let i = 0; i < 6000; i++) {
      const p = [0, 1, 2].map((e) => lo[e] - 0.5 + rand() * (hi[e] - lo[e] + 1));
      if (C.d(p[0], p[1], p[2]) > 0) continue;
      inside++;
      assert.ok(p.every((v, e) => v >= lo[e] - 1e-9 && v <= hi[e] + 1e-9), `field ${k}: ${p} inside but out of [${lo}] - [${hi}]`);
    }
    assert.ok(inside > 10, `field ${k} has an inside`);
    // the march's promise: nearer the surface than d / lip is never inside it
    for (let i = 0; i < 1500; i++) {
      const a = [0, 1, 2].map((e) => lo[e] + rand() * (hi[e] - lo[e])), b = a.map((v) => v + (rand() - 0.5) * 0.2);
      const da = C.d(a[0], a[1], a[2]), db = C.d(b[0], b[1], b[2]);
      assert.ok(Math.abs(da - db) <= C.lip * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1.05 + 1e-9, `field ${k}: steeper than lip ${C.lip}`);
    }
  }
  assert.throws(() => surfaceSize(sdf.plane()), /goes on without end/);
});

test("sdf: distance, occupancy, density and appearance are four kinds, made from a distance, never mixed", () => {
  const rock = sdf.sphere(1).mat("stone").paint("moss", (p, n) => n[2] > 0.6), occ = sdf.occupancy(rock), den = sdf.density(rock, { edge: 0.5 }), look = sdf.appearance(rock);
  assert.deepEqual([rock.kind, occ.kind, den.kind, look.kind], ["distance", "occupancy", "density", "appearance"]);
  assert.equal(occ.inside([0, 0, 0.5]), true); assert.equal(occ.inside([0, 0, 1.5]), false);
  near(den.at([0, 0, 0]), 1); near(den.at([0, 0, 2]), 0); assert.ok(den.at([0, 0, 0.75]) > 0 && den.at([0, 0, 0.75]) < 1);
  assert.equal(look.at([0, 0, 1], [0, 0, 1]), "moss"); assert.equal(look.at([1, 0, 0], [1, 0, 0]), "stone");
  assert.equal(sdf.appearance(sdf.sphere(1)).at([1, 0, 0]), null);
  assert.throws(() => rock.union(den as unknown as Sdf), /made from a distance field.*a density/);
  assert.throws(() => sdf.occupancy(occ as unknown as Sdf), /an occupancy/);
  const e = (() => { try { loadSource(PAL + `sprite("a", { w: 8, h: 8 }, surface(sdf.density(sdf.sphere(1))))`, "t.px.js").image("a"); } catch (err) { return err as Error; } })();
  assert.match(String(e?.message), /draws a distance field.*not a density/);
});

const ART = PAL + `const ball = sdf.sphere(0.5).at(0, 0, 0.5)
sprite("a", { w: 20, h: 20 }, surface(ball, { ppm: 16, mats: { m: "kgw" } }))
`;
test("surface: the inside opaque and the rest clear, outlined away from the light, its normals, the same every time", () => {
  const p = loadSource(ART, "t.px.js"), rows = keys(p, "a").split("\n"), img = p.image("a");
  // a ball 16 px across standing on the middle of the bottom edge
  assert.equal(rows[19][10] !== ".", true); assert.equal(rows[3][1], "."); assert.equal(rows[10][10] !== ".", true);
  // its outline: the darkest key low on the right, none high on the left; lit up there
  const right = rows[12].replace(/\.+$/, ""), left = rows[8].replace(/^\.+/, "");
  assert.equal(right[right.length - 1], "k"); assert.notEqual(left[0], "k");
  assert.ok((rows[5].match(/w/g) ?? []).length > 0, "the lit side's lightest tone");
  // its normals: facing the eye in the middle, to the left on its left
  const nz = (x: number, y: number) => img.norm![(y * 20 + x) * 3 + 2], nx = (x: number, y: number) => img.norm![(y * 20 + x) * 3];
  assert.ok(nz(10, 11) > 100); assert.ok(nx(3, 11) < -60);
  assert.equal(loadSource(ART, "t.px.js").image("a").hash(), img.hash());
});

test("surface: from the top a ball is round; through a camera after a mesh(), behind the wall and its shadow on the ground", () => {
  const top = keys(loadSource(PAL + `sprite("a", { w: 20, h: 20 }, surface(sdf.sphere(0.5), { view: "top", ppm: 16, at: [10, 10], mats: { m: "kgw" } }))`, "t.px.js"), "a").split("\n");
  const wide = (r: string) => r.replace(/\./g, "").length;
  assert.ok(Math.abs(wide(top[10]) - 16) <= 1 && Math.abs(top.filter((r) => wide(r)).length - 16) <= 1, "16 px across both ways");
  // a level camera 1 m up: a ground, a low wall across at z 3, a ball behind it at z 4, the sun high on the left
  const scene = (wall: boolean) => keys(loadSource(PAL + `ramps("kgw")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }, M = model()
M.face("g", [-5, 0.5, 0], [5, 0.5, 0], [5, 20, 0], [-5, 20, 0])
${wall ? `M.box("s", [-1, 3, 0], [1, 3.1, 0.4])` : ""}
scene("a", { w: 40, h: 40 }, (c) => c.mesh(V, M.faces, { g: { ramp: "w" }, s: { ramp: "r" } }), (c) => c.surface(sdf.sphere(0.4).at(0, 0, 0.4), { view: V, at: [0, 4, 0], mats: { m: "kgw" }, light: [-1, 0, 1] }))`, "t.px.js"), "a").split("\n");
  const w = scene(true), o = scene(false);
  // the ball's foot (z 4, row 20) hidden by the wall (its top 0.4 m up at z 3.1: row 17.7), its top over it
  assert.equal(w[20][20], "r", "the wall in front"); assert.notEqual(o[20][20], "w", "the ball there without the wall");
  assert.ok(w.slice(0, 18).some((r) => /[kg]/.test(r)), "the ball shows over the wall");
  // its shadow: on the ground to the right of the ball (the sun on the left), a step down the ramp
  assert.ok(o.slice(18, 24).some((r) => r.slice(24, 34).includes("g")), "a shadow to the right on the ground");
  assert.ok(o[20].slice(0, 12).split("").every((k) => k === "w"), "none to the left");
});

test('light "mesh": a surface, a volume and draw3d after a mesh() with a sun take its light (its way, its sun and sky on their tones)', () => {
  const src = (light: string, sun = true) => PAL + `ramps("kgw")
const V = { w: 40, horizon: 10, eye: 1, focal: 40 }, M = model()
M.face("g", [-5, 0.5, 0], [5, 0.5, 0], [5, 20, 0], [-5, 20, 0])
const ground = (c) => c.mesh(V, M.faces, { g: { ramp: "w" } }, { light: [-1, 0, 1], ${sun ? 'sun: "#ffd0a0", sky: "#6070a0"' : ""} })
scene("a", { w: 40, h: 40 }, ground, (c) => c.surface(sdf.sphere(0.4).at(0, 0, 0.4), { view: V, at: [0, 4, 0], mats: { m: "rgw" }, light: ${light} }))
scene("d", { w: 40, h: 40 }, ground, (c) => c.draw3d(sdf.sphere(0.4).at(0, 0, 0.4), { view: V, at: [0, 4, 0], mats: { m: "rgw" }, light: ${light} }))
scene("v", { w: 40, h: 40 }, ground, (c) => c.volume(sdf.density(sdf.sphere(0.4).at(0, 0, 0.4)), { view: V, at: [0, 4, 0], ramp: "rgw", thickness: 9, light: ${light} }))`;
  const p = loadSource(src('"mesh"'), "t.px.js"), q = loadSource(src("[-1, 0, 1]"), "t.px.js");
  for (const n of ["a", "v"]) {
    const lit = keys(p, n).split("\n"), own = keys(q, n).split("\n");
    // where the plain one drew its tones (r, g), the lit one drew them in the sun and sky: off the palette
    const at = own.flatMap((r, y) => [...r].map((k, x) => (k === "r" || k === "g" ? [x, y] : null))).filter((v) => v) as number[][];
    assert.ok(at.length > 20, `${n}: drawn`);
    assert.ok(at.every(([x, y]) => lit[y][x] === "?"), `${n}: lit by the mesh's sun and sky`);
  }
  assert.equal(p.image("d").hash(), p.image("a").hash(), "draw3d passes it on");
  assert.match(failure(src('"mesh"', false), "a").message, /light: "mesh" is the light of a mesh\(\) with a sun/);
  // a wall's shadow (mesh()'s faces) falls on the field: sky only there, darker
  const walled = loadSource(src('"mesh"').replace("const ground", 'M.face("g", [-1.2, 3, 0], [-1.2, 5, 0], [-1.2, 5, 3], [-1.2, 3, 3])\nconst ground'), "t.px.js");
  const [W0, W1] = [p.image("a"), walled.image("a")], darker = [];
  for (let y = 12; y < 21; y++) for (let x = 14; x < 30; x++) if ((W1.get(x, y) >>> 24) < (W0.get(x, y) >>> 24)) darker.push(x);
  assert.ok(darker.length > 10, `in the wall's shadow: ${darker.length} px darker`);
});

test("look3d: the 3D ops' light and mats where a call doesn't say them; a call's own wins, light \"view\" the view's own", () => {
  const F = `const f = sdf.sphere(0.4).at(0, 0, 0.4).union(sdf.box([0.3, 0.3, 0.3]).at(0.4, 0, 0.15).mat("m2")), O = { view: "iso", ppm: 16, at: [12, 22] }, L = [0.7, 0.2, 0.6], M = { "": "kgw", m2: "krw" }\n`;
  const p = loadSource(PAL + F + `sprite("given", { w: 24, h: 24 }, surface(f, { ...O, light: L, mats: M }))
sprite("plain", { w: 24, h: 24 }, surface(f, { ...O, mats: M }))
look3d({ light: L, mats: M })
sprite("taken", { w: 24, h: 24 }, surface(f, O))
sprite("own", { w: 24, h: 24 }, surface(f, { ...O, light: "view" }))`, "t.px.js");
  assert.equal(p.image("taken").hash(), p.image("given").hash(), "look3d's light and mats");
  assert.equal(p.image("own").hash(), p.image("plain").hash(), "light: \"view\", the view's own");
  assert.notEqual(p.image("given").hash(), p.image("plain").hash());
});

test("turnaround and draw3d: surface passes more of surface()'s options (an outline left off)", () => {
  const p = loadSource(PAL + `ramps("kgw")
const F = sdf.sphere(0.4).at(0, 0, 0.4)
turnaround("a", F, { view: "side", headings: ["s"], mats: { "": "kgw" } })
turnaround("b", F, { view: "side", headings: ["s"], mats: { "": "kgw" }, surface: { outline: false } })
sprite("c", { w: 20, h: 20 }, draw3d(F, { view: "side", ppm: 16, at: [0, 0, 0], mats: { "": "kgw" }, surface: { outline: false } }))
sprite("d", { w: 20, h: 20 }, draw3d(F, { view: "side", ppm: 16, at: [0, 0, 0], mats: { "": "kgw" } }))`, "t.px.js");
  assert.notEqual(p.image("a_s").hash(), p.image("b_s").hash());
  assert.notEqual(p.image("c").hash(), p.image("d").hash());
  assert.match(failure(PAL + `turnaround("e", sdf.sphere(1), { surface: "soft" })`).message, /surface is more of surface/);
  // drawn by hand after it: a point on its front face where the camera 20 degrees down puts it over the pivot; never mirrored by itself
  const q = loadSource(PAL + `ramps("kgw")
turnaround("f", sdf.box([0.6, 0.6, 0.6]).at(0, 0, 0.3), { view: "side", n: 4, mats: { "": "kgw" }, draw: (c, v) => { const [x, y] = v.screen([0, -0.3, 0.3]); c.px(Math.round(x), Math.round(y), "#ff00ff"); if (!(v.depth([0, -1, 0]) > v.depth([0, 1, 0]))) throw new Error("its front is nearer") } })`, "t.px.js");
  const im = q.image("f_s"), pv = im.pivot!;
  assert.equal(im.get(pv[0], pv[1] - Math.round(16 * 0.3 * (Math.cos(Math.PI / 9) - Math.sin(Math.PI / 9)))), q.assets.get("f_s")!.pal.resolve("#ff00ff"));
  assert.equal(q.assets.get("f_e")!.opts.flip, undefined);
});

test("turnaround: a thing seen from N headings, named by the compass (an iso view's 4 its diagonals), one size, its foot on the pivot; the east mirrored where it can be", async () => {
  const { headingsOf } = await import("../src/core/turnaround.ts");
  assert.deepEqual(headingsOf(4, undefined, true).map((h) => h.name), ["ne", "se", "sw", "nw"]);
  assert.deepEqual(headingsOf(4, undefined, false).map((h) => h.name), ["n", "e", "s", "w"]);
  assert.deepEqual(headingsOf(16, undefined, false).slice(0, 4).map((h) => h.name), ["n", "nne", "ne", "ene"]);
  assert.deepEqual(headingsOf(12, undefined, false).slice(0, 2).map((h) => [h.name, h.deg]), [["0", 0], ["1", 30]]);
  assert.deepEqual(headingsOf(undefined, ["s", 90], false).map((h) => [h.name, h.deg]), [["s", 180], ["e", 90]]);
  // a box with a nose at its front (-y), off its middle (no mirror), lit from the left; and one on its middle, lit from above
  const p = loadSource(PAL + `ramps("kgw")
const F = (x) => sdf.box([0.6, 0.6, 0.6]).at(0, 0, 0.3).union(sdf.sphere(0.15).at(x, -0.35, 0.3))
const A = turnaround("a", F(0.2), { view: "side", n: 8, mats: { "": "kgw" }, light: [-1, -0.3, 1] })
const B = turnaround("b", F(0), { view: "side", n: 8, mats: { "": "kgw" }, light: [0, -0.5, 1] })
const I = turnaround("i", F(0), { view: "iso", n: 4, mats: { "": "kgw" } })`, "t.px.js");
  const A = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  assert.deepEqual(A.map((h) => [p.image(`a_${h}`).w, p.image(`a_${h}`).h]), A.map(() => [p.image("a_n").w, p.image("a_n").h]), "one size");
  assert.ok(p.groups.get("a")!.members.length === 8 && p.has("i_ne") && p.has("i_sw"));
  // the nose: toward us at s (in the middle), right at e, left at w; hidden behind at n
  const cols = (n: string) => { const im = p.image(n), xs: number[] = []; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if ((im.get(x, y) & 255) > 0) xs.push(x); return [Math.min(...xs), Math.max(...xs)]; };
  const [e0, e1] = cols("a_e"), [w0, w1] = cols("a_w"), [n0, n1] = cols("a_n");
  assert.ok(e1 > n1 && w0 < n0, `the nose sticks out right at e (${e0}..${e1}), left at w (${w0}..${w1}), not at n (${n0}..${n1})`);
  // mirrored: b's east is its west flipped; a's (off its middle, lit from the left) drawn
  assert.equal(p.assets.get("b_e")!.opts.flip, "x"); assert.equal(p.assets.get("b_e")!.opts.base, "b_w");
  assert.equal(p.assets.get("a_e")!.opts.flip, undefined);
  assert.equal(p.image("b_e").hash(), p.image("b_w").flip("x").hash());
  // its pivot at its foot: under the middle of its box, at its lowest rows
  const pv = p.image("b_s").pivot!, [s0, s1] = cols("b_s"), im = p.image("b_s");
  let low = 0;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if ((im.get(x, y) & 255) > 0) low = y;
  assert.ok(Math.abs(pv[0] - (s0 + s1 + 1) / 2) <= 1 && low >= pv[1] - 1 && low <= pv[1] + 3, `pivot ${pv}, columns ${s0}..${s1}, lowest row ${low}`);
  // its height its top over its origin, standing there: pxl check reads its feet at its pivot, the
  // front of its box and its line lower down
  assert.deepEqual([im.meters, im.grounded, p.image("b_e").grounded], [0.6, true, true]);
  const { checkProject } = await import("../src/node/check.ts");
  const q = loadSource(PAL + `ramps("kgw")
turnaround("b", sdf.box([0.6, 0.6, 0.6]).at(0, 0, 0.3), { view: "side", n: 4, mats: { "": "kgw" } })
scene("s", { w: 40, h: 40, world: { scale: 16, ground: 30 } }, stamp("b_s", 12, 30), stamp("b_n", 28, 33))`, "t.px.js");
  const r = checkProject(q);
  assert.deepEqual([r.lines.length, r.coverage.match(/feet on \d+/)?.[0]], [1, "feet on 2"], r.lines.join("\n"));
  assert.match(r.lines[0], /b_n @-, feet [\d,]+ › WARNING: its feet \(y 33\) are 3 px below the ground \(y 30\)/);
});

test("surface: a material's hems hang under it, its strokes lighter where the sun is, a back rim at least that far up its ramp", () => {
  const draw = (mat: string, o = "") => keys(loadSource(PAL + `sprite("a", { w: 24, h: 24 }, surface(sdf.box([0.6, 0.4, 0.4]).at(0, 0, 0.5), { view: "side", ppm: 24, at: [12, 20], mats: { m: ${mat} }${o} }))`, "t.px.js"), "a").split("\n");
  const plain = draw('"kgrw"'), low = (rows: string[]) => Math.max(...rows.flatMap((r, y) => (/[^.]/.test(r) ? [y] : [])));
  const hem = draw('{ ramp: "kgrw", hem: 2 }'), under = hem.slice(low(plain) + 1).join("");
  assert.ok(low(hem) > low(plain) && low(hem) <= low(plain) + 2, "hems 1 to 2 px under it");
  assert.ok(/[^.]\.[^.]/.test(hem[low(plain) + 1]) && under.replace(/\./g, "").length < under.length / 2, "every other column");
  const st = draw('{ ramp: "kgrw", strokes: 2 / 24 }');
  assert.ok(st.join("") !== plain.join("") && st.every((r, y) => [...r].every((ch, x) => (ch === ".") === (plain[y][x] === "."))), "strokes: tones, not the shape");
  // a ball lit from behind on the left: where it is open left and up, the top of its ramp (9)
  const ball = (o: string) => keys(loadSource(PAL + `sprite("a", { w: 24, h: 24 }, surface(sdf.sphere(0.35).at(0, 0, 0.4), { view: "side", ppm: 24, at: [12, 20], light: [-1, 1, 0.4], mats: { m: "0123456789" }${o} }))`, "t.px.js"), "a");
  const [b0, b1] = [ball(""), ball(", rim: 1")];
  assert.ok(!b0.includes("9") && b1.includes("9") && b1.replace(/9/g, "").length > b1.length - 8, "rim 1: the edge's corners toward the light the ramp's top, a few of them");
  assert.match(failure(PAL + 'sprite("a", { w: 9, h: 9 }, surface(sdf.sphere(0.2), { mats: { m: { ramp: "kw", hem: 1.5 } } }))', "a").message, /hem whole px/);
});
