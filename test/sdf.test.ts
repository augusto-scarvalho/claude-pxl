// Fields in 3D (sdf.ts): distances that are right, the same field the same at the same moment, every
// point inside within the bounds a renderer clips to, the four kinds kept apart; and surface(), the
// field drawn as pixel art: what is inside opaque, outlined away from the light, the normals, the
// views, and through a camera at mesh()'s depth with its shadow on the ground.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Sdf, compile, fbm3, sdf } from "../src/core/sdf.ts";
import { surfaceSize } from "../src/core/surface.ts";
import { loadSource } from "../src/node/load.ts";
import { failure, keys, PAL } from "./helpers.ts";

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
});
