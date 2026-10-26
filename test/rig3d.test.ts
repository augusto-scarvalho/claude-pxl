// A figure on the 3D layer (rig3d.ts): two-bone IK in 3D, the walk's numbers by the view, hand-drawn
// views placed by a heading and their rows checked, and rig3d's figure: its blocks in every heading,
// feet on the ground line, its parts painted by a hook, the east mirrored, the escape hatches.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gait, ik3 } from "../src/core/rig3d.ts";
import { sdf } from "../src/core/sdf.ts";
import { checkProject } from "../src/node/check.ts";
import { loadSource } from "../src/node/load.ts";
import { PAL, keys } from "./helpers.ts";

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("ik3: the joint at both bones' lengths, toward the hint; out of reach, straight", () => {
  const k = ik3([0, 0, 10], [0, 1, 1], 5, 5, [0, 1, 0]);
  assert.ok(Math.abs(dist(k, [0, 0, 10]) - 5) < 1e-9 && Math.abs(dist(k, [0, 1, 1]) - 5) < 1e-9 && k[1] > 0.5, `knee ${k}`);
  const s = ik3([0, 0, 0], [0, 0, -20], 5, 5, [1, 0, 0]);
  assert.ok(Math.abs(s[2] + 5) < 0.01 && Math.abs(s[0]) < 0.5, `straight ${s}`);
});

test("gait: the guide's walk by the view (lift 1, 3, 1 facing us, the other foot half a cycle later; a long stride in profile); a table or a number overrides", () => {
  const f = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => gait(i / 8, { heading: 180 }));
  assert.deepEqual(f.map((g) => g.feet[0][1]), [0, 0, 0, 0, 0, 1, 3, 1]);
  assert.deepEqual(f.map((g) => g.feet[1][1]), [0, 1, 3, 1, 0, 0, 0, 0]);
  assert.deepEqual(f.map((g) => g.bob), [1, 0, 0, 0, 1, 0, 0, 0]);
  assert.equal(f[0].view, "front"); assert.equal(gait(0, { heading: 0 }).view, "back");
  // the hand across from the lifted foot forward and up
  assert.deepEqual(f[2].hands[0], [0.8, 1.4]); assert.deepEqual(f[2].hands[1], [-0.4, 0]);
  const p = gait(0.25, { heading: 270 });
  assert.equal(p.view, "profile"); assert.ok(Math.abs(p.feet[0][0] - 4.6) < 1e-9 && Math.abs(p.feet[1][0] + 4.6) < 1e-9 && p.bob === 2);
  assert.equal(gait(0.25, { view: "profile", stride: 4 }).feet[0][0], 4);
  assert.equal(gait(0.25, { heading: 225, diagonal: { bob: [0, 0, 9, 0, 0, 0, 9, 0] } }).bob, 9);
  assert.throws(() => gait(0, { pace: 1 }), /no option pace/);
});

const VIEWS = `${PAL}
views("_h", { s: "kk.\\nkrk", w: "kr\\nkk" }, { anchor: { s: [1, 1], w: [0, 1] } })
scene("at", { w: 12, h: 4 }, stamp("_h", 2, 2, { heading: 180 }), stamp("_h", 6, 2, { heading: 90 }), stamp("_h", 10, 2, { heading: [-1, 0] }))`;

test("views: each drawn view pivoted on its anchor, the ones not drawn mirrored about it; stamp(..., { heading }) picks the nearest", () => {
  const p = loadSource(VIEWS, "t.px.js");
  assert.deepEqual(p.groups.get("_h")!.members, ["_h_e", "_h_s", "_h_w"]);
  // s at 2 (its anchor pixel [1, 1] on (2, 2)), e the mirror of w at 6 (its anchor column on 6), w at 10
  assert.equal(keys(p, "at"), ["............", ".kk..rk...kr", ".krk.kk...kk", "............"].join("\n"));
});

test("views: pxl check holds the crown and chin to one row in every view, and with like, each row within a pixel of the other set's", () => {
  const ok = checkProject(loadSource(VIEWS, "t.px.js"));
  assert.match(ok.coverage, /views' rows on 1/); assert.equal(ok.warnings, 0);
  const bad = checkProject(loadSource(`${PAL}
views("_a", { s: "kkk\\nkkk\\nkkk", w: "...\\nkkk\\nkkk" }, { anchor: [1, 1] })
views("_b", { s: "kkkkkkk\\n..kkk..\\n..kkk.." }, { anchor: [3, 1], like: "_a" })
views("_c", { s: "kkkkk\\n.kkk.\\n.kkk." }, { anchor: [2, 1], like: "_a" })
views("_d", { s: "kkk\\nkkk\\nkkk\\n.k.", w: "kkk\\nkkk\\nkkk" }, { anchor: [1, 1] })
views("_e", { s: "kkk\\nkkk\\nkkk\\n.k.", w: "kkk\\nkkk\\nkkk" }, { anchor: [1, 1], chin: 2 })`, "t.px.js"));
  // (_c's top row a pixel wider each side: kept; _e's beard below the chin it names: kept)
  assert.deepEqual(bad.lines, [
    "_a › WARNING: its crown isn't on one row in every view (from the anchor: -1 in s; 0 in w): a head that turns bobs",
    "_b › WARNING: s: row -1 (2 px left, 2 px right) from the anchor sticks out past _a_s by more than a pixel",
    "_d › WARNING: its chin isn't on one row in every view (from the anchor: 2 in s; 1 in w): a head that turns bobs",
  ]);
});

const FIG = `${PAL}
const walk = (i, h) => { const g = gait(i / 2, { heading: h }); return { feet: g.feet.map(([f], k) => [f, k ? 2 : -2]), lift: g.feet.map(([, u]) => u), down: g.bob } }
const T = rig3d("t", { body: { h: 34, heads: 3 }, w: 26, h: 40, pivot: [13, 38], blocks: true, n: 4,
  moves: { walk: { frames: 2, ms: 100, pose: walk, draw: (c, j) => c.setSocket("hand", ...j.screen(j.arms[1].hand)) } },
  parts: (j) => ({ legs: j.legs.map((L) => j.limb(L.hip, L.ankle, 1.5, 1.5, (h) => (h < 0.5 ? "r" : "g"))), body: j.limb(j.pelvis, j.chest, 3.5, 3.5, "w") }) })
scene("s", { w: 30, h: 42 }, stamp("t_walk", 15, 39, { heading: 180 }))
// no size given: its fields' boxes over every frame and heading
rig3d("u", { blocks: "bu", n: 4, moves: { idle: { frames: 1, pose: () => ({}) } } })
// the escape hatch: a pose's joints at a heading, where they land (facing us, his right hip on our left)
sprite("hatch", { w: 1, h: 1 }, (c) => { const j = T.joints({}, 180); if (j.legs[1].hip[0] < 0 && Math.abs(T.screen(j.pelvis)[1] - (38 - j.pelvis[2] * Math.cos(Math.PI / 9))) < 1e-9) c.px(0, 0, "r") })`;

test("rig3d: its blocks and its painted figure in every heading, feet on the pivot's row, parts painted by a hook, the east the west's mirror", () => {
  const p = loadSource(FIG, "t.px.js");
  assert.deepEqual(p.groups.get("bk_walk")!.members, ["bk_walk_n", "bk_walk_e", "bk_walk_s", "bk_walk_w"]);
  const b = p.image("bk_walk_s"), opaque = (im: typeof b, x: number, y: number) => (im.data[y * im.w + x] & 255) >= 128;
  // the soles on the pivot's row (38), the line under them on the next
  const low = Math.max(...Array.from({ length: b.h }, (_, y) => y).filter((y) => Array.from({ length: b.w }, (_, x) => x).some((x) => opaque(b, x, y))));
  assert.equal(low, 39, "the outline under the soles");
  // facing us, his right limbs (light) on our left
  const at = (im: typeof b, c: string) => { const col = p.pal.resolve(c)!; let s = 0, n = 0; im.data.forEach((v, i) => { if (v === col) { s += i % im.w; n++; } }); return n ? s / n : NaN; };
  assert.ok(at(b, "#98e2ec") < 13 && at(b, "#2b6b91") > 13, "right light on the left");
  // painted: the hook's two materials, the east the west flipped (its foot on the same pivot)
  const s = keys(p, "t_walk_s");
  assert.ok(s.includes("r") && s.includes("g") && s.includes("w"), s);
  assert.deepEqual([...p.image("t_walk_e").data], [...p.image("t_walk_w").flip("x").data]);
  assert.equal(p.image("t_walk_e").pivot![0], 12);
  // the escape hatches: the joints and where they land; the draw hook set a socket in each frame
  assert.equal(keys(p, "hatch"), "r");
  // sized by itself: all of it inside, clear round it, the soles on the pivot's row (the near foot a row
  // lower in profile: it is nearer us, seen from a little above), the line under them
  for (const d of ["n", "e", "s", "w"]) {
    const u = p.image(`bu_idle_${d}`), rows = keys(p, `bu_idle_${d}`).split("\n"), py = u.pivot![1];
    assert.ok(!/[^.]/.test(rows[0]) && !/[^.]/.test(rows.at(-1)!) && rows.every((r) => r[0] === "." && r.at(-1) === "."), rows.join("\n"));
    assert.ok(/[^.]/.test(rows[py]) && /[^.]/.test(rows[py + 1]) && !/[^.]/.test(rows[py + 3]), `${d}: soles on row ${py}\n${rows.join("\n")}`);
  }
  assert.ok(p.image("bk_walk_s").sockets?.hand);
  assert.match(keys(p, "s"), /r/);
});

test("rig3d: a cloth swept round the body (open in front, its lining), a decal pinned on it, the line all round; pxl check: a pose off the ground, a leg out of reach", () => {
  const p = loadSource(`${PAL}
ramps("kgw", "krw")
sprite("_dot", "w")
rig3d("c", { w: 26, h: 40, pivot: [13, 38], headings: ["s", "n"], ink: "k", surface: { soft: 0.5 },
  moves: { idle: { frames: 1, pose: () => ({}) }, hop: { frames: 2, pose: (i) => ({ lift: [2 * i, 2 * i] }) }, reach: { frames: 1, pose: () => ({ feet: [[9, -2], [0, 2]] }) } },
  parts: (j) => ({ body: j.limb(j.pelvis, j.chest, 3, 3, "g"),
    cloak: j.sweep([0, 0, 0], 8, j.chest[2], () => 4.5, { shell: 0.4, keep: (h, a) => Math.abs(a) > 1.2, paint: (h, a, out) => (out ? "r" : "w") }),
    mark: j.decal("_dot", [j.chest[0] + j.f[0] * 3, j.chest[1] + j.f[1] * 3, j.chest[2] - 3]),
    fuzz: j.scatter(j.limb(j.pelvis, j.chest, 3, 3).field, { brush: "dot", count: 1, size: 1, mat: "g", seed: 1 }) }) })`, "t.px.js");
  // the brushes drew on it, as a part of their own
  assert.ok(p.image("c_idle_s").parts!.names.includes("fuzz"));
  const s = keys(p, "c_idle_s").split("\n"), n = keys(p, "c_idle_n").split("\n");
  // facing us: the body through the cloak's open front, its lining inside, its edges beside; from behind,
  // the cloak (the shoulders above it)
  assert.ok(s.some((r) => /r.*g.*r/.test(r)) && s.some((r) => r.includes("w")), s.join("\n"));
  assert.ok(n.filter((r) => /^[.]*kr+k[.]*$/.test(r)).length >= 10, n.join("\n"));
  // the line all round: every row's ends the ink
  for (const r of s.filter((q) => /[^.]/.test(q))) assert.ok(r.replace(/[.]/g, "").startsWith("k") && r.replace(/[.]/g, "").endsWith("k"), r);
  const lines = checkProject(p).lines;
  assert.deepEqual(lines.filter((l) => l.startsWith("c ›")), [
    "c › hop s › WARNING: both feet off the ground (up to 2.0 px): it floats (frame 1)",
    "c › hop n › WARNING: both feet off the ground (up to 2.0 px): it floats (frame 1)",
    "c › reach s › WARNING: a leg longer than its bones (by up to 3.0 px): its foot out of reach; lower the pelvis or bring the foot in (frame 0)",
    "c › reach n › WARNING: a leg longer than its bones (by up to 3.0 px): its foot out of reach; lower the pelvis or bring the foot in (frame 0)",
  ]);
});

test("surface: pieces of one part parted by its own darkest tone, parts by the line; decal: depth, how far a nearer surface may be and still take it", () => {
  const p = loadSource(`${PAL}
ramps("kgw", "krw")
const F = sdf.union(sdf.sphere(4).at(0, 6, 4).part("a"), sdf.sphere(1.5).at(-2.5, 0, 4).part("b")).mat("m").part("hair").union(sdf.sphere(1.5).at(2.5, 0, 4).mat("m").part("body"))
sprite("x", { w: 16, h: 12 }, (c) => c.surface(F, { ppm: 1, at: [8, 10], view: { kind: "side", pitch: 0 }, mats: { m: "rww" }, light: [0, -1, 0], soft: 1, outline: false, rim: false, shadows: false, ao: 0, inner: "k" }))
sprite("_d", "g")
const G = sdf.union(sdf.sphere(3), sdf.sphere(1).at(0, -3.2, 0)), BIG = sdf.sphere(3)
for (const [n, o] of [["near", {}], ["deep", { depth: 2 }]]) sprite(n, { w: 12, h: 12 }, (c) => c.surface(G, { ppm: 1, at: [6, 6], view: { kind: "side", pitch: 0 }, mats: { m: "w" }, outline: false, rim: false, shadows: false }),
  (c) => c.decal("_d", { on: BIG, point: [0, -3, 0], view: { kind: "side", pitch: 0 }, ppm: 1, at: [6, 6], ...o }))`, "t.px.js");
  // the big ball behind: a dark seam of its own beside the lock in front, the line beside the other part
  assert.match(keys(p, "x").split("\n")[5], /w+rkw+/, keys(p, "x"));
  // a decal on the big ball, where a small one sits a little nearer: lost, or taken over it with depth
  assert.ok(!keys(p, "near").includes("g") && keys(p, "deep").includes("g"), keys(p, "near") + "\n\n" + keys(p, "deep"));
});

test("surface: inner lines on the part behind another; paint((p, n) => name) and a material named by its ramp of keys", () => {
  const p = loadSource(`${PAL}
const F = sdf.union(sdf.sphere(4).at(0, 6, 4).mat("w").part("back"), sdf.sphere(2).at(0, 0, 4).paint((q) => (q[0] < 0 ? "r" : "g")).part("front"))
sprite("x", { w: 16, h: 14 }, (c) => c.surface(F, { ppm: 1, at: [8, 12], view: { kind: "side", pitch: 0 }, mats: { w: "w" }, outline: false, rim: false, shadows: false, inner: "k" }))`, "t.px.js");
  const rows = keys(p, "x").split("\n");
  // the small ball in front: red left, green right; the big one behind it ringed in k where they meet
  assert.match(rows[7], /k[r]+[g]+k/, rows.join("\n"));
  assert.ok(sdf.sphere(1).paint(() => "x").dist([2, 0, 0]) === 1);
});

test("clean: surface cuts a pixel sticking out and draws an inner line along the contour in its own darkest; a decal none edge on; rig3d's chin under a modeled head's skin", () => {
  const p = loadSource(`${PAL}
ramps("kgw", "krw")
// a ball with a bump smaller than a pixel; a ball in front of another, across its edge
const BUMP = sdf.union(sdf.sphere(4), sdf.sphere(0.7).at(4.4, 0, 0.5)).mat("g")
const TWO = sdf.union(sdf.sphere(4).at(0, 6, 4).mat("b").part("back"), sdf.sphere(2).at(3, 0, 4).mat("f").part("front"))
sprite("_d", "ggg")
for (const clean of [false, true]) {
  const o = { ppm: 1, view: { kind: "side", pitch: 0 }, outline: false, rim: false, shadows: false, ao: 0, light: [0, -1, 0], soft: 1, clean }
  sprite(\`bump_\${clean}\`, { w: 14, h: 12 }, (c) => c.surface(BUMP, { ...o, at: [6, 10], mats: { g: "gw" } }))
  sprite(\`two_\${clean}\`, { w: 16, h: 14 }, (c) => c.surface(TWO, { ...o, at: [8, 12], mats: { b: "rw", f: "g" }, inner: "k" }))
  sprite(\`dec_\${clean}\`, { w: 12, h: 12 }, (c) => c.surface(sdf.sphere(3.6), { ...o, at: [6, 6], mats: { m: "w" } }),
    (c) => c.decal("_d", { on: sdf.sphere(3.6), point: [2.5, -2, -2], view: { kind: "side", pitch: 0 }, ppm: 1, at: [6, 6], lit: false, clean }))
}
for (const chin of [undefined, "r"]) rig3d(\`f\${chin ?? ""}\`, { w: 26, h: 40, pivot: [13, 38], headings: ["s"], ink: "k", chin, moves: { idle: { frames: 1, pose: () => ({}) } },
  parts: (j) => ({ body: j.limb(j.pelvis, j.chest, 3, 3, "g"), head: j.ball(j.head, 4, "w") }) })`, "t.px.js");
  const rows = (n: string) => keys(p, n).split("\n"), on = (r: string[], x: number, y: number) => (r[y]?.[x] ?? ".") !== ".";
  const spurs = (r: string[]) => r.flatMap((row, y) => [...row].map((_, x) => on(r, x, y) && +on(r, x - 1, y) + +on(r, x + 1, y) + +on(r, x, y - 1) + +on(r, x, y + 1) <= 1)).filter(Boolean).length;
  assert.ok(spurs(rows("bump_false")) >= 1 && spurs(rows("bump_true")) === 0, keys(p, "bump_false") + "\n\n" + keys(p, "bump_true"));
  // the back ball's line beside the clear: its own darkest (r, which its light never reaches), fewer ink
  const count = (n: string, k: string) => keys(p, n).split(k).length - 1;
  assert.ok(count("two_false", "r") === 0 && count("two_true", "r") > 0 && count("two_true", "k") < count("two_false", "k"), keys(p, "two_false") + "\n\n" + keys(p, "two_true"));
  // the decal's texel on the silhouette's last pixel (its normal 0.15 toward the eye): gone
  assert.ok(count("dec_false", "g") === 3 && count("dec_true", "g") === 2, keys(p, "dec_false") + "\n\n" + keys(p, "dec_true"));
  // under the head, where it meets the body: the ink, or the chin's line
  assert.ok(count("f_idle_s", "r") === 0 && count("fr_idle_s", "r") >= 3, keys(p, "fr_idle_s"));
});
