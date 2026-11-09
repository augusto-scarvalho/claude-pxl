// A figure on the 3D layer (rig3d.ts): two-bone IK in 3D, the walk's numbers by the view, hand-drawn
// views placed by a heading and their rows checked, and rig3d's figure: its blocks in every heading,
// feet on the ground line, its parts painted by a hook, the east mirrored, the escape hatches.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { FLAWS, blocksOf, bodyOf, gait, ik3, jointsOf, poseFlaws, turned } from "../src/core/rig3d.ts";
import { compile, sdf } from "../src/core/sdf.ts";
import { checkProject } from "../src/node/check.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { PAL, keys } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/rig3d.test.ts", ["lib/characters/traveler.px.js", "lib/characters/dress.px.js"]);

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
  // the planted foot goes back at an even speed (2.3 px a frame in profile), the body over it 4 strides a cycle
  const back = [2, 3, 4, 5, 6].map((i) => gait(i / 8, { heading: 90 }).feet[0][0]);
  assert.ok(back.every((v, i) => Math.abs(v - (4.6 - 2.3 * i)) < 1e-9), back.join());
  assert.equal(gait(0, { heading: 90 }).pace, 18.4);
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
  // standing on that pivot, the mirror too: pxl check reads its feet there
  assert.deepEqual([p.image("t_walk_w").grounded, p.image("t_walk_e").grounded, b.grounded], [true, true, true]);
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

test("rig3d: a grip puts both hands on one line; j.rod draws a held rod in the figure's own depth, painted and in the blocks", () => {
  const p = loadSource(`${PAL}
ramps("kg")
// in front of the chest (y toward us) and behind the belly (away), across the whole sprite
const rods = (c, j) => { j.rod([-14, -8, 18], [14, -8, 18], "r"); j.rod([-14, 8, 14], [14, 8, 14], (t) => (t < 0.5 ? "w" : "w")) }
const R = rig3d("g", { w: 32, h: 44, pivot: [16, 40], headings: ["s"], ink: "k", blocks: true,
  moves: { hold: { frames: 1, pose: () => ({}), draw: rods } }, parts: (j) => ({ body: j.limb(j.pelvis, j.chest, 4, 4, "kg") }) })
sprite("x", { w: 1, h: 1 }, (c) => {
  const j = R.joints({ grip: { from: [4, -3, 16], to: [4, 7, 2], at: [0, 0.6] } }, 180), [a, b] = j.grip, d = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2])
  if (d(j.arms[0].hand, a) < 1e-9 && d(j.arms[1].hand, a.map((v, e) => v + (b[e] - v) * 0.6)) < 1e-9 && Math.abs(a[2] - 16) < 1e-9) c.px(0, 0, "r")
})`, "t.px.js");
  assert.equal(keys(p, "x"), "r", "the hands at their shares of the grip's line, its ends from under the pelvis");
  const rows = keys(p, "g_hold_s").split("\n"), front = rows.find((r) => r.includes("r"))!, back = rows.find((r) => r.includes("w"))!;
  // in front: one run over the body; behind: either side of it only, the line round the body kept
  assert.match(front, /r{26}/, rows.join("\n"));
  assert.match(back, /^\.*w+k[kg]+kw+\.*$/, rows.join("\n"));
  const b = p.image("bk_hold_s"), red = p.pal.resolve("r")!, wh = p.pal.resolve("w")!, row = (c: number) => Array.from({ length: b.h }, (_, y) => y).find((y) => b.data.slice(y * b.w, (y + 1) * b.w).includes(c))!;
  assert.ok(b.data.slice(row(red) * b.w, (row(red) + 1) * b.w).filter((v) => v === red).length >= 26 && b.data[row(wh) * b.w + 16] !== wh, "the blocks: in front over them, behind under them");
  assert.throws(() => loadSource(`${PAL}rig3d("e", { blocks: true, moves: { m: { frames: 1, pose: () => ({ grip: { from: [0, 0], to: [1, 1, 1], at: [0, 1] } }) } } })`, "t.px.js").image("bk_m_s"), /a pose's grip is/);
});

test("rig3d: a move's ms a list, a number a frame (a strike's 60/40/80); sized by itself, its parts get j.depth and j.screen", () => {
  const p = loadSource(`${PAL}
// parts that read the joints' depth and where they land (as the traveler's dress() does), and no w, h, pivot
const parts = (j) => ({ body: j.limb(j.pelvis, j.chest, j.depth(j.chest) > -100 && j.screen(j.chest)[1] < 100 ? 3 : 1, 3, "w") })
rig3d("f", { body: { h: 30, heads: 3 }, headings: ["s"], parts, moves: { strike: { frames: 3, ms: [60, 40, 80], pose: () => ({}) } } })`, "t.px.js");
  assert.deepEqual(p.timeline("f_strike_s")!.durations, [60, 40, 80]);
  assert.ok(p.image("f_strike_s").pivot, "sized, its foot point found");
  assert.throws(() => loadSource(`${PAL}rig3d("e", { blocks: true, moves: { m: { frames: 2, ms: [60], pose: () => ({}) } } })`, "t.px.js"), /a list, a number a frame/);
});

test("dress() (lib/characters/traveler.px.js): the shirt's body swept along the spine; spine: false, round an upright through the hips", () => {
  // a point on the spine under the chest of a figure leaning 30 degrees: inside the one, outside the other
  const f = join(mkdtempSync(join(tmpdir(), "pxl-")), "t.px.js");
  writeFileSync(f, `include(${JSON.stringify(join(import.meta.dirname, "../lib/characters/traveler.px.js"))})
const T = traveler, R = rig3d("q", { ...T.FIG, parts: T.dress(T.TRAVELER), moves: { m: { frames: 1, pose: () => ({}) } } })
const j = R.joints({ lean: 30 }, 270), q = j.chest.map((v, e) => v - 2 * j.spine[e]), d = (o) => T.dress(o)(j, {}).tunic[1].field.dist(q)
sprite("x", { w: 2, h: 1 }, (c) => { if (d(T.TRAVELER) < -1.5) c.px(0, 0, "#ff0000"); if (d({ ...T.TRAVELER, spine: false }) > 0) c.px(1, 0, "#ff0000") })`);
  assert.ok([...loadProject(f).image("x").data].every((v) => (v & 255) === 255));
});

test("dress() drapes' push (lib/characters/dress.px.js): the legs push the cloth, kept push px over a knee swung ahead; its paint told how far", () => {
  // a long skirt 2.5 px round the hips, striding: where the front knee's cloth would be (its radius and push ahead of
  // it, at its height) the skirt passes with push and misses it without; the paint's fourth argument above 0 there
  const f = join(mkdtempSync(join(tmpdir(), "pxl-")), "t.px.js");
  writeFileSync(f, `include(${JSON.stringify(join(import.meta.dirname, "../lib/characters/traveler.px.js"))})
const T = traveler, R = rig3d("q", { ...T.FIG, parts: T.dress(T.TRAVELER), moves: { m: { frames: 1, pose: () => ({}) } } })
const j = R.joints({ feet: [[5, -2], [-5, 2]] }, 180), L = j.legs.reduce((a, b) => (b.knee[0] * j.f[0] + b.knee[1] * j.f[1] > a.knee[0] * j.f[0] + a.knee[1] * j.f[1] ? b : a))
let felt = 0
const skirt = (push) => T.dress({ ...T.TRAVELER, drapes: [{ base: "pelvis", top: (j) => j.pelvis[2] + 1.4, len: 14, out: (h, a, o, p) => ((felt = Math.max(felt, p ?? 0)), "x"), trail: 0, keep: () => true, radius: () => 2.5, push }] })(j, { trail: 0, sway: 0 }).cloak
const q = L.knee.map((v, e) => v + (e < 2 ? j.f[e] * (dress.r.leg[1] + 0.8) : 0)), on = skirt(0.8), off = skirt(undefined)
const checks = [on.field.dist(q) < 0, off.field.dist(q) > 0.3, (on.paint(0.5, 0, true), true) && on.paint(...on.at(q).slice(0, 2), true) === "x" && felt > 0.5]
sprite("x", { w: checks.length, h: 1 }, (c) => checks.forEach((ok, i) => ok && c.px(i, 0, "#ff0000")))`);
  assert.deepEqual([...loadProject(f).image("x").data].map((v) => (v & 255) === 255), [true, true, true]);
});

test("dress({ creases }) (lib/characters/traveler.px.js): a pair only where a joint bends (knee past 60, elbow past 45), in the ramps' ends or the keys given; off, the paint as it was", () => {
  // kneeling (both knees past 100 degrees, one elbow 47), and the idle's breath (the knees 51: none)
  const f = join(mkdtempSync(join(tmpdir(), "pxl-")), "t.px.js");
  writeFileSync(f, `include(${JSON.stringify(join(import.meta.dirname, "../lib/characters/traveler.px.js"))})
const T = traveler, R = rig3d("q", { ...T.FIG, parts: T.dress(T.TRAVELER), moves: { m: { frames: 1, pose: () => ({}) } } })
const knelt = R.joints(T.MOVES.kneel.pose(3, 180), 180), breath = R.joints(T.MOVES.idle.pose(1, 180), 180)
const on = T.dress({ ...T.TRAVELER, creases: true }), P = on(knelt, {}), B = on(breath, {}), Q = T.dress(T.TRAVELER)(knelt, {}), G = T.dress({ ...T.TRAVELER, creases: { deep: "r", lit: "g" } })(knelt, {})
// off (or bent less): the thighs and the sleeves their ramps, the shins by height alone, as before
const plain = (S) => [0, 1].every((i) => typeof S["leg" + i][0].paint === "string" && S["leg" + i][1].paint.length === 1 && typeof S["arm" + i][0].paint === "string" && typeof S["arm" + i][1].paint === "string")
const bent = ["arm0", "arm1"].filter((k) => typeof P[k][0].paint === "function")
const checks = [
  plain(Q) && plain(B),
  P.leg0[0].paint(0.9, 3) === "R" && /^[pP]$/.test(P.leg0[0].paint(0.9, 0)) && P.leg0[0].paint(0.5, 3) === Q.leg0[0].paint,
  P.leg1[1].paint(0.1, 3) === "R" && P.leg1[1].paint(0.6, 0) === Q.leg1[1].paint(0.6),
  G.leg0[0].paint(0.9, 3) === "r" && G.leg0[0].paint(0.9, 0) === "g" && G.leg1[1].paint(0.1, 3) === "r",
  bent.length === 1 && P[bent[0]][0].paint(0.9, 0) === "v" && /^[wW]$/.test(P[bent[0]][1].paint(0.1, 0)) && P[bent[0]][1].paint(0.5, 0).length === 3,
]
sprite("x", { w: checks.length, h: 1 }, (c) => checks.forEach((ok, i) => ok && c.px(i, 0, "#ff0000")))`);
  assert.deepEqual([...loadProject(f).image("x").data].map((v) => (v & 255) === 255), [true, true, true, true, true]);
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
    "c › hop s › WARNING: both feet off the ground (up to 2.0 px; a pose turned by roll: its lowest part): it floats (frame 1)",
    "c › hop n › WARNING: both feet off the ground (up to 2.0 px; a pose turned by roll: its lowest part): it floats (frame 1)",
    "c › reach s › WARNING: a leg longer than its bones (by up to 3.0 px): its foot out of reach; lower the pelvis or bring the foot in (frame 0)",
    "c › reach n › WARNING: a leg longer than its bones (by up to 3.0 px): its foot out of reach; lower the pelvis or bring the foot in (frame 0)",
  ]);
});

test("rig3d: a pose's elbow hint bends the elbows its way (the default as it was); pxl check: an elbow bent forward; a pose in the air", () => {
  // an arm swung back and bent: the default hint (mostly down) puts its elbow ahead of the shoulder-hand line
  const B = bodyOf({ h: 34, heads: 3 }), back = { hands: [[-4, -1, -4], [-4, 1, -4]] }, was = jointsOf(B, back, 90), now = jointsOf(B, { ...back, elbow: [-1, 0.5, 0] }, 90);
  assert.deepEqual(jointsOf(B, { ...back, elbow: [-0.4, 0.5, -1] }, 90).arms, was.arms);
  assert.ok(poseFlaws(B, was).elbow > 0.5 && poseFlaws(B, now).elbow < 0 && poseFlaws(B, jointsOf(B, {}, 90)).elbow <= 0, `${poseFlaws(B, was).elbow}, ${poseFlaws(B, now).elbow}`);
  assert.throws(() => jointsOf(B, { elbow: [1, 2] }, 90), /a pose's elbow/);
  // the check says the frame bent the wrong way, not the one with the hint; a hop's frame in the air isn't floating, its data says so
  const p = loadSource(`${PAL}rig3d("f", { headings: ["e"], blocks: true, moves: {
    swing: { frames: 2, pose: (i) => ({ hands: [[-4, -1, -4], [-4, 1, -4]], ...(i ? { elbow: [-1, 0.5, 0] } : {}) }) },
    hop: { frames: 2, pose: (i) => ({ lift: [2 * i, 2 * i], air: i === 1 }) } } })`, "t.px.js");
  assert.deepEqual(checkProject(p).lines.filter((l) => l.startsWith("f ›")), [
    `f › swing e › WARNING: an elbow bent the wrong way (up to ${poseFlaws(B, was).elbow.toFixed(1)} px ahead of its shoulder-hand line): give the pose an elbow hint behind him: elbow: [-1, 0.5, 0] ([-1, 0.5, -1] with the hand at or over the shoulder) (frame 0)`,
  ]);
  assert.deepEqual(p.drawn("bk_hop_e").map((f) => f.img.info), [undefined, { air: true }]);
});

test("rig3d: a pose's rise lifts the chest and the head along the spine over a still pelvis, the legs as they were", () => {
  const B = bodyOf({ h: 34, heads: 3 }), a = jointsOf(B, { lean: 10 }, 90), b = jointsOf(B, { lean: 10, rise: 2 }, 90);
  assert.deepEqual([b.pelvis, b.legs], [a.pelvis, a.legs]);
  assert.ok(Math.abs(dist(b.chest, a.chest) - 2) < 1e-9 && Math.abs(dist(b.head, a.head) - 2) < 1e-9 && b.head[2] > a.head[2], `${b.head} ${a.head}`);
  assert.throws(() => jointsOf(B, { rise: "1" as unknown as number }, 90), /a pose's rise/);
});

test("rig3d: soles puts each heading's soles on the row they end on facing us (a profile's near foot, a heel toward us), the feet moved by a pose's away", () => {
  const B = bodyOf({ h: 53.4, heads: 2.81, hip: 14, thigh: 7, shin: 5.6, ankle: 1.4, torso: 20.6, neck: 9.25, hips: 4.8, r: { foot: [3, 4, 1.8] } }), a = jointsOf(B, {}, 180), b = jointsOf(B, { away: 2 }, 180);
  assert.deepEqual([b.pelvis, b.legs.map((L) => L.hip)], [a.pelvis, a.legs.map((L) => L.hip)]);
  assert.ok(b.legs.every((L, i) => Math.abs(L.ankle[1] - 2 - a.legs[i].ankle[1]) < 1e-9 && L.ankle[0] === a.legs[i].ankle[0]));
  const low = (soles: boolean) => {
    const p = loadSource(`${PAL}rig3d("g", { body: ${JSON.stringify({ h: 53.4, heads: 2.81, hip: 14, thigh: 7, shin: 5.6, ankle: 1.4, torso: 20.6, neck: 9.25, hips: 4.8, r: { foot: [3, 4, 1.8] } })}, headings: ["s", "e", "n"], pitch: 45, w: 36, h: 64, pivot: [17, 54], ink: "k", blocks: true, soles: ${soles}, moves: { idle: { frames: 1, pose: () => ({}) } } })`, "t.px.js");
    return ["s", "e", "n"].map((d) => { const im = p.image(`bk_idle_${d}`); let y = im.h - 1; while (!im.data.slice(y * im.w, (y + 1) * im.w).some((v) => (v & 255) >= 128)) y--; return y; });
  };
  const [was, now] = [low(false), low(true)];
  assert.ok(was[1] > was[0] && was[0] > was[2], `as seen from above: the profile's near foot lowest, the heels highest ${was}`);
  assert.deepEqual(now, [was[0], was[0], was[0]]);
  assert.throws(() => loadSource(`${PAL}rig3d("g", { blocks: true, soles: 1, moves: { m: { frames: 1, pose: () => ({}) } } })`, "t.px.js"), /soles is true/);
});

test("rig3d's foot: toes and heel 0 the joints as they were; a foot turned out, its knee over it; a heel up, the foot turned on its ball; pxl check: the toe on the ground, a foot bent past its ankle", () => {
  const B = bodyOf({ h: 34, heads: 3 }), k = B.r.foot[1] / 2.3;
  // as rig3d put them before the foot: the knee aimed where the hips face, the foot's middle 1.1 k ahead of the ankle that way, its sole under it
  for (const p of [{ turn: 0 }, { feet: [[5, -2], [-5, 2]], lift: [0, 2], turn: -30, down: 2 }, { lean: 10, turn: 20, away: 1, down: 1 }]) for (const h of [0, 90, 180, 225]) {
    const j = jointsOf(B, p, h);
    assert.deepEqual(jointsOf(B, { ...p, toes: [0, 0], heel: [0, 0] }, h).legs, j.legs);
    for (const L of j.legs) {
      assert.deepEqual(L.knee, ik3(L.hip, L.ankle, B.thigh, B.shin, [j.f[0] + 0, j.f[1] + 0, j.f[2] + 0.3]));
      assert.deepEqual(L.foot, [0, 1, 2].map((e) => L.ankle[e] + j.f[e] * (1.1 * k)));
      assert.ok([L.heel, L.ball, L.toe].every((q) => Math.abs(q[2] - (L.ankle[2] - B.ankle)) < 1e-9) && L.heading === h + p.turn, `${L.heel} ${L.toe}`);
    }
  }
  const flat = (a: number[], b: number[]) => { const v = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n]; };
  const deg = (u: number[], v: number[]) => (Math.acos(Math.min(1, u[0] * v[0] + u[1] * v[1])) * 180) / Math.PI;
  // facing east, the right foot 60 out (toward us): its sole that way, and its knee out over it (seen from above, off the hip-ankle line); the left as it was
  const a = jointsOf(B, { down: 3 }, 90), o = jointsOf(B, { down: 3, toes: [0, 60] }, 90), R = o.legs[1];
  const out = (L: (typeof a.legs)[number]) => flat(L.hip.map((v, e) => (v + L.ankle[e]) / 2), L.knee);
  assert.ok(deg(flat(R.heel, R.toe), [Math.sin((150 * Math.PI) / 180), Math.cos((150 * Math.PI) / 180)]) < 1e-6 && R.heading === 150);
  assert.ok(deg(out(R), flat(R.heel, R.toe)) < 1 && deg(out(a.legs[1]), flat([0, 0], a.f)) < 1, `${out(R)} ${out(a.legs[1])}`);
  assert.deepEqual(o.legs[0], a.legs[0]);
  // the right heel up 1.5: the ball and the toe where they were, the heel 1.5 higher, the ankle as far from the ball (on the arc round it), up and nearer it
  const u = jointsOf(B, { down: 3, heel: [0, 1.5] }, 90), F = a.legs[1], U = u.legs[1];
  assert.deepEqual(u.legs[0], a.legs[0]);
  assert.ok(dist(U.ball, F.ball) < 1e-9 && dist(U.toe, F.toe) < 1e-9 && Math.abs(U.heel[2] - F.heel[2] - 1.5) < 1e-9, `${U.heel} ${F.heel}`);
  assert.ok(Math.abs(dist(U.ankle, U.ball) - dist(F.ankle, F.ball)) < 1e-9 && U.ankle[2] > F.ankle[2] + 0.5 && Math.hypot(U.ankle[0] - U.ball[0], U.ankle[1] - U.ball[1]) < Math.hypot(F.ankle[0] - F.ball[0], F.ankle[1] - F.ball[1]));
  // pxl check: the sole's lowest point on the ground (a heel up doesn't float); a deep bend over a flat foot, and a heel up past 45 down, bend it past
  // the ankle, read on the poses that give the foot (toes or heel: one that gives neither keeps the flat foot of before, unread)
  assert.ok(Math.abs(poseFlaws(B, u).floats) < 1e-9 && poseFlaws(B, jointsOf(B, {}, 90)).ankle === 0 && poseFlaws(B, a).ankle > 10);
  const p = loadSource(`${PAL}rig3d("f", { headings: ["e"], blocks: true, moves: { m: { frames: 4, pose: (i) => [{ heel: [0, 1] }, { down: 3, toes: [0, 0] }, { heel: [0, 3.4] }, { down: 3 }][i] } } })`, "t.px.js");
  const lines = checkProject(p).lines.filter((l) => l.startsWith("f ›"));
  assert.equal(lines.length, 1, lines.join("\n"));
  assert.match(lines[0], /^f › m e › WARNING: a foot bent past its ankle \(up to \d+ degrees past .*\(frames 1-2\)$/);
});

test("rig3d's point: a free foot turned at its ankle from square to its shin, its sole with it; null the rig's foot; pxl check reads it against its shin", () => {
  const B = bodyOf({ h: 34, heads: 3 }), k = B.r.foot[1] / 2.3, kick = { feet: [[0, -2], [9, 2]], lift: [0, 8], down: 1 };
  const a = jointsOf(B, kick, 90), shin = (L: (typeof a.legs)[number]) => (Math.acos(Math.min(1, Math.max(-1, [0, 1, 2].reduce((s, e) => s + ((L.toe[e] - L.heel[e]) / dist(L.toe, L.heel)) * ((L.knee[e] - L.ankle[e]) / dist(L.knee, L.ankle)), 0)))) * 180) / Math.PI;
  assert.deepEqual(jointsOf(B, { ...kick, point: [null, null] }, 90).legs, a.legs);
  for (const pt of [-30, 0, 45, 60]) {
    const L = jointsOf(B, { ...kick, point: [null, pt] }, 90).legs[1];
    // the knee and the ankle where they were, the foot square to the shin turned pt toward its line, the sole B.ankle under the ankle along it
    assert.ok(dist(L.knee, a.legs[1].knee) < 1e-9 && dist(L.ankle, a.legs[1].ankle) < 1e-9 && Math.abs(shin(L) - 90 - pt) < 1e-6 && Math.abs(dist(L.foot, L.ankle) - 1.1 * k) < 1e-9 && L.point === pt, `${pt}: ${shin(L)}`);
  }
  const flaw = (pt: number) => poseFlaws(B, jointsOf(B, { ...kick, point: [null, pt] }, 90)).ankle;
  assert.ok(flaw(60) < 1e-9 && flaw(-30) < 1e-9 && Math.abs(flaw(75) - 15) < 1e-6 && Math.abs(flaw(-40) - 10) < 1e-6);
  assert.throws(() => jointsOf(B, { ...kick, heel: [0, 1], point: [null, 30] }, 90), /heel turns a foot on its ball/);
  // read on a pose that gives only point
  const p = loadSource(`${PAL}rig3d("f", { headings: ["e"], blocks: true, moves: { m: { frames: 2, pose: (i) => ({ ...${JSON.stringify(kick)}, air: true, point: [null, [50, 80][i]] }) } } })`, "t.px.js");
  assert.deepEqual(checkProject(p).lines.filter((l) => l.startsWith("f ›")).map((l) => l.replace(/\d+ degrees/, "N degrees")), [`f › m e › WARNING: ${FLAWS.ankle(20).replace(/\d+ degrees/, "N degrees")} (frame 1)`]);
});

test("rig3d's roll: the whole figure turned about its pelvis in the picture's plane, as drawn; its parts built upright and turned with it; pxl check reads its lowest part", () => {
  const B = bodyOf({ h: 34, heads: 3 }), lie = { down: B.hip - B.r.body[0], lift: [-(B.hip - B.r.body[0]), -(B.hip - B.r.body[0])] };
  const up = jointsOf(B, lie, 90), j = jointsOf(B, { ...lie, roll: 90 }, 90), t = turned(j);
  // upright as given (the parts are built on it), turned as drawn: the head behind the pelvis at its height, the feet ahead
  assert.deepEqual(j.legs, up.legs);
  assert.ok(Math.abs(t.head[2] - j.pelvis[2]) < 1e-9 && Math.abs(t.head[0] - (j.pelvis[0] - (j.head[2] - j.pelvis[2]))) < 1e-9 && t.legs.every((L) => L.ankle[0] > j.pelvis[0] + 5), `${t.head} ${t.legs[0].ankle}`);
  assert.equal(turned(up), up);
  // the blocks turned with it: the head's ball where the turned joints put it, none left over the pelvis
  const f = compile(blocksOf(B, j));
  assert.ok(f.d(...t.head) < 0 && f.d(j.pelvis[0], j.pelvis[1], j.head[2]) > 0.5);
  // lying on the floor it doesn't float; lifted 6 px, it does (by its lowest bone past 3 px; the feet off the ground are no flaw)
  assert.ok(poseFlaws(B, j).floats < 0.5 && poseFlaws(B, jointsOf(B, { ...lie, down: lie.down - 6, roll: 90 }, 90)).floats > 0.5);
});

test("rig3d's nod: the neck turned about the chest in the picture's plane to stand that far from upright as drawn", () => {
  const B = bodyOf({ h: 34, heads: 3 }), pose = { lean: 10, turn: -50, roll: 70 }, plain = jointsOf(B, pose, 180);
  for (const nod of [12, -20]) {
    const j = jointsOf(B, { ...pose, nod }, 180), t = turned(j), n = [0, 1, 2].map((e) => t.head[e] - t.chest[e]);
    // as drawn, nod degrees from upright toward the picture's right; the neck's length and its depth kept; the rest still
    assert.ok(Math.abs((Math.atan2(n[0], n[2]) * 180) / Math.PI - nod) < 1e-9 && Math.abs(dist(j.head, j.chest) - B.neck) < 1e-9 && Math.abs(j.head[1] - plain.head[1]) < 1e-9, `${nod}: ${n}`);
    assert.deepEqual([j.chest, j.legs, j.arms], [plain.chest, plain.legs, plain.arms]);
  }
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

test('inner: "dark": where one part meets another, the darkest tone of the part behind; rig3d\'s ink then only all round', () => {
  // a ball in front of a bigger one, and a figure's body with a ball before its middle: their ramps' darkest (r) lit nowhere
  const p = loadSource(`${PAL}
const F = sdf.union(sdf.sphere(4).at(0, 6, 4).mat("rww").part("back"), sdf.sphere(2).at(0, 0, 4).mat("g").part("front"))
sprite("x", { w: 16, h: 14 }, (c) => c.surface(F, { ppm: 1, at: [8, 12], view: { kind: "side", pitch: 0 }, mats: { rww: "rww", g: "g" }, outline: false, rim: false, shadows: false, ao: 0, light: [0, -1, 0], soft: 1, inner: "dark" }))
for (const inner of [undefined, "dark"]) rig3d(\`f\${inner ? "d" : ""}\`, { w: 26, h: 40, pivot: [13, 38], headings: ["s"], ink: "k", inner, light: [0, -1, 0], surface: { soft: 1 }, moves: { idle: { frames: 1, pose: () => ({}) } },
  parts: (j) => ({ body: j.limb(j.pelvis, j.chest, 4, 4, "rww"), arm: j.ball(j.pelvis.map((v, e) => (v + j.chest[e]) / 2 - (e === 1 ? 5 : 0)), 2, "g") }) })`, "t.px.js");
  const grid = (n: string) => keys(p, n).split("\n"), at = (r: string[], x: number, y: number) => r[y]?.[x] ?? ".";
  const where = (r: string[], k: string) => r.flatMap((row, y) => [...row].flatMap((c, x) => (c === k ? [[x, y]] : [])));
  const by = (r: string[], [x, y]: number[], k: string) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(r, x + dx, y + dy) === k);
  const x = grid("x"), f = grid("f_idle_s"), d = grid("fd_idle_s");
  assert.ok(where(x, "r").length >= 4 && where(x, "r").every((q) => by(x, q, "g")) && !where(x, "k").length, keys(p, "x"));
  // the figure: its line inside (k beside the ball) the body's darkest, the line round it (k beside the clear) as it was
  assert.ok(where(f, "k").some((q) => !by(f, q, ".")) && where(d, "k").every((q) => by(d, q, ".")), keys(p, "fd_idle_s"));
  assert.deepEqual(where(d, "k"), where(f, "k").filter((q) => by(f, q, ".")));
  assert.ok(where(d, "r").length >= 4 && where(d, "r").every((q) => by(d, q, "g")), keys(p, "fd_idle_s"));
});

test("clean: surface cuts a pixel sticking out and an inner line's sliver along the outline (one line, not two); a decal none edge on; rig3d's chin under a modeled head's skin", () => {
  const p = loadSource(`${PAL}
ramps("kgw", "krw")
// a ball with a bump smaller than a pixel; a ball in front of another, across its edge
const BUMP = sdf.union(sdf.sphere(4), sdf.sphere(0.7).at(4.4, 0, 0.5)).mat("g")
const TWO = sdf.union(sdf.sphere(4).at(0, 6, 4).mat("b").part("back"), sdf.sphere(2).at(3, 0, 4).mat("f").part("front"))
sprite("_d", "ggg")
for (const clean of [false, true, undefined]) {
  const o = { ppm: 1, view: { kind: "side", pitch: 0 }, outline: false, rim: false, shadows: false, ao: 0, light: [0, -1, 0], soft: 1, clean }
  sprite(\`bump_\${clean}\`, { w: 14, h: 12 }, (c) => c.surface(BUMP, { ...o, at: [6, 10], mats: { g: "gw" } }))
  sprite(\`two_\${clean}\`, { w: 16, h: 14 }, (c) => c.surface(TWO, { ...o, at: [8, 12], mats: { b: "rw", f: "g" }, inner: "k" }))
  sprite(\`dec_\${clean}\`, { w: 12, h: 12 }, (c) => c.surface(sdf.sphere(3.6), { ...o, at: [6, 6], mats: { m: "w" } }),
    (c) => c.decal("_d", { on: sdf.sphere(3.6), point: [2.5, -2, -2], view: { kind: "side", pitch: 0 }, ppm: 1, at: [6, 6], lit: false, clean }))
}
for (const chin of [undefined, ["r", "w"]]) rig3d(\`f\${chin?.[0] ?? ""}\`, { w: 26, h: 40, pivot: [13, 38], headings: ["s"], ink: "k", chin, moves: { idle: { frames: 1, pose: () => ({}) } },
  parts: (j) => ({ body: j.limb(j.pelvis, j.chest, 3, 3, "g"), head: j.ball(j.head, 4, "w") }) })`, "t.px.js");
  const rows = (n: string) => keys(p, n).split("\n"), on = (r: string[], x: number, y: number) => (r[y]?.[x] ?? ".") !== ".";
  const spurs = (r: string[]) => r.flatMap((row, y) => [...row].map((_, x) => on(r, x, y) && +on(r, x - 1, y) + +on(r, x + 1, y) + +on(r, x, y - 1) + +on(r, x, y + 1) <= 1)).filter(Boolean).length;
  assert.ok(spurs(rows("bump_false")) >= 1 && spurs(rows("bump_true")) === 0, keys(p, "bump_false") + "\n\n" + keys(p, "bump_true"));
  assert.ok(keys(p, "bump_undefined") === keys(p, "bump_true") && keys(p, "two_undefined") === keys(p, "two_true"), "clean is on by default");
  // the back ball's line where it runs between the clear and the ball in front (a sliver): cut, the
  // outline round it the one line there; never a dark tone in place of a line (r, which its light never reaches)
  const count = (n: string, k: string) => keys(p, n).split(k).length - 1;
  assert.ok(count("two_false", "k") - count("two_true", "k") === 2 && count("two_true", ".") - count("two_false", ".") === 2 && count("two_true", "r") === 0, keys(p, "two_false") + "\n\n" + keys(p, "two_true"));
  // the decal's texel on the silhouette's last pixel (its normal 0.15 toward the eye): gone
  assert.ok(count("dec_false", "g") === 3 && count("dec_true", "g") === 2, keys(p, "dec_false") + "\n\n" + keys(p, "dec_true"));
  // under the head, where it meets the body: the ink, or the chin's line
  assert.ok(count("f_idle_s", "r") === 0 && count("fr_idle_s", "r") >= 3, keys(p, "fr_idle_s"));
});

test("views of a head modeled: drawn once per view with its line round it, a retouch painted over (. keeps, _ erases), the east mirrored; sdf.field", () => {
  const p = loadSource(`${PAL} ramps("krw")
views("_m", sdf.sphere(3).mat("krw"), { ink: "k", anchor: [1, 1], retouch: { s: "_.g\\n.gg" } })`, "t.px.js");
  assert.deepEqual(p.groups.get("_m")!.members, ["_m_n", "_m_ne", "_m_e", "_m_se", "_m_s", "_m_sw", "_m_w", "_m_nw"]);
  assert.equal(p.assets.get("_m_e")!.opts.base, "_m_w");
  const s = p.image("_m_s"), [cx, cy] = s.pivot!.map(Math.floor), at = (x: number, y: number) => s.data[y * s.w + x], K = (k: string) => p.pal.keys.get(k);
  assert.equal(at(cx - 1, cy - 1) & 255, 0, "erased");
  assert.equal(at(cx, cy), K("g"));
  assert.equal(at(cx + 1, cy - 1), K("g"));
  // the line round it: the first pixel left of the head on its middle row
  let x = 0;
  while ((at(x, cy) & 255) < 128) x++;
  assert.equal(at(x, cy), K("k"));
  const slab = sdf.field((x, y, z) => Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 2, [-2, -2, -2], [2, 2, 2]);
  assert.ok(Math.abs(slab.dist([3, 0, 0]) - 1) < 1e-9 && slab.dist([0, 0, 0]) < 0);
});
