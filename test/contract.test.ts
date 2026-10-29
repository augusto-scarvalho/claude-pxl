// What an engine reads off a sheet and what a thing is made for: colors by role (roleSwap), palette
// slots in a sheet's export, sockets and a turnaround's footprint in the JSON, genre() and its checks.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keys, PAL } from "./helpers.ts";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { checkProject } from "../src/node/check.ts";
import { roleSwap } from "../src/core/palette.ts";
import type { Project } from "../src/core/project.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/contract.test.ts");
/** Write `only`'s outputs to a temp folder, hand it to `f`, remove it. */
const built = (p: Project, only: string[], f: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-contract-"));
  try { writeOutputs(p, dir, { only, preview: false }); f(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const json = (dir: string, n: string) => JSON.parse(readFileSync(join(dir, n + ".json"), "utf8"));

test("roleSwap: each role's keys to a livery's or a slot's, keys or colors; the roles left out keep theirs", () => {
  // the car's (F1 lab): two liveries by role, the 2D swap from one to the other
  const ROLES = { primary: "aAbB", accent: "wWx", glass: "gG", tyre: "ktT", rim: "TsS" };
  // (the roles given back as they were stay in it: a no-op here, a kit's colors to yours over its base)
  assert.deepEqual(roleSwap(ROLES, { ...ROLES, primary: "cCdD", accent: "uUv" }), { a: "c", A: "C", b: "d", B: "D", w: "u", W: "U", x: "v", g: "g", G: "G", k: "k", t: "t", T: "T", s: "s", S: "S" });
  // Reva's: a palette slot, colors for some roles
  assert.deepEqual(roleSwap({ hair: "HhJ", shoes: "Oo" }, { hair: ["#3a1a12", "#6e3420", "#a8562e"] }), { H: "#3a1a12", h: "#6e3420", J: "#a8562e" });
  assert.throws(() => roleSwap(ROLES, { primry: "cCdD" }), /role 'primry' isn't in the first map.*primary/);
  assert.throws(() => roleSwap(ROLES, { accent: "uU" }), /role 'accent' is 3 keys \("wWx"\), so 3 new ones/);
  assert.throws(() => roleSwap(ROLES, { tyre: "kxX", rim: "TsS" }), /key 'T' is in tyre and rim, which swap it to X and T/);
  // a sprite's swap in a file
  const p = loadSource(PAL + `const R = { body: "rw" }; sprite("a", "rw"); sprite("b", { base: "a", swap: roleSwap(R, { body: "gk" }) })`, "t.px.js");
  assert.equal(keys(p, "b"), "gk");
  assert.throws(() => loadSource(PAL + `roleSwap({ a: "r" }, "g")`, "t.px.js"), /roleSwap.*two maps of roles/);
});

test("sheet slots: the sheet's colors and each slot's in that order in its JSON, a .hex each", () => {
  const p = loadSource(PAL + `anim("hit", { frames: 2, fps: 10, w: 2, h: 1 }, (c) => { c.px(0, 0, "r"); c.px(1, 0, c.frame ? "w" : "k") })
sheet("moves", ["hit"], { slots: { blue: { r: "#29adff" }, gold: roleSwap({ skin: "rw" }, { skin: "gk" }) } })
sheet("plain", ["hit"])`, "t.px.js");
  built(p, ["moves", "plain"], (dir) => {
    const m = json(dir, "moves").meta;
    // as they first appear (r, k, then frame 1's w); a slot's color i is what color i becomes
    assert.deepEqual(m.palette, ["#ff004d", "#000000", "#fff1e8"]);
    assert.deepEqual(m.slots, { blue: ["#29adff", "#000000", "#fff1e8"], gold: ["#00e436", "#000000", "#000000"] });
    assert.equal(readFileSync(join(dir, "moves.hex"), "utf8"), "ff004d\n000000\nfff1e8\n");
    assert.equal(readFileSync(join(dir, "moves.gold.hex"), "utf8"), "00e436\n000000\n000000\n");
    assert.equal(json(dir, "plain").meta.slots, undefined, "none asked, none written");
  });
  assert.throws(() => loadSource(PAL + `sheet("s", ["a"], { slots: { x: { q: "r" } } })`, "t.px.js"), /sheet 's' slots.*unknown color key 'q'/);
  assert.throws(() => loadSource(PAL + `sheet("s", ["a"], { slots: ["r"] })`, "t.px.js"), /slots is \{ name: swap \}/);
});

test("sockets go into the sheet's JSON with each frame, in its px", () => {
  const p = loadSource(PAL + `sprite("gun", { w: 4, h: 2, sockets: { muzzle: [4, 1] } }, rect(0, 0, 4, 1, "r"))
anim("wave", { frames: 2, fps: 10, w: 3, h: 3 }, (c) => { c.px(1, 1, "r"); if (c.frame) c.setSocket("hand", 2, 0.5) })
sheet("kit", ["gun", "wave"])`, "t.px.js");
  built(p, ["kit"], (dir) => {
    const f = json(dir, "kit").frames;
    assert.deepEqual(f.gun.sockets, { muzzle: { x: 4, y: 1 } });
    assert.equal(f.wave_0.sockets, undefined);
    assert.deepEqual(f.wave_1.sockets, { hand: { x: 2, y: 0.5 } });
  });
});

test("genre(): a profile as data, given back with its name; scale a box, checks by name", () => {
  const p = loadSource(PAL + `const G = genre("racing", { camera: { kind: "side", pitch: { flat: 6 } }, grid: 16, scale: { car: [1, 2] }, steer: [-2, 2], checks: ["footprint"] })
sprite("x", { w: 1, h: 1 }, px(0, 0, G.steer[1] === 2 && G.name === "racing" && G.scale.car[1] === 2 ? "r" : "k"))`, "t.px.js");
  assert.equal(keys(p, "x"), "r");
  for (const [spec, err] of [
    [`{ checks: ["feet"] }`, /checks are some of ground, height, footprint/],
    [`{ scale: { tree: 2.5 } }`, /scale is a box per category, \[tall, wide\]/],
    [`{ grid: 0 }`, /grid is a tile's px/],
  ] as const) assert.throws(() => loadSource(PAL + `genre("g", ${spec})`, "t.px.js"), err);
  assert.throws(() => loadSource(PAL + `genre("g", {}); genre("g", {})`, "t.px.js"), /genre 'g' is already defined at t.px.js:1/);
  assert.throws(() => loadSource(PAL + `sprite("s", { genre: 3 }, px(0, 0, "r"))`, "t.px.js"), /genre names a genre\(\) it is made for/);
  // rig3d passes it to its painted moves (their directions a family), not to the blocks
  const q = loadSource(PAL + `rig3d("f", { body: { h: 30, heads: 3 }, n: 4, blocks: true, genre: "td", parts: (j) => ({ body: j.limb(j.pelvis, j.chest, 3, 3, "w") }), moves: { idle: { frames: 1, pose: () => ({}) } } })`, "t.px.js");
  assert.deepEqual(["f_idle_s", "f_idle_e", "bk_idle_s"].map((n) => q.assets.get(n)!.opts.genre), ["td", "td", undefined]);
});

test("genre checks: the feet on one ground line through a move (fighting), a frame in the air left out; a genre no genre() defines", () => {
  const p = loadSource(PAL + `genre("fighting", { checks: ["ground"] })
anim("step", { frames: 4, fps: 10, w: 4, h: 6, pivot: [2, 6], genre: "fighting" }, (c) => c.rect(1, 0, 2, c.frame === 2 ? 5 : 6, "r"))
anim("bob", { frames: 2, fps: 10, w: 4, h: 6, genre: "fighting" }, (c) => c.rect(1, c.frame, 2, 6 - c.frame, "r"))
anim("hop", { frames: 3, fps: 10, w: 4, h: 6, genre: "fighting" }, (c) => { c.rect(1, 0, 2, c.frame === 1 ? 4 : 6, "r"); if (c.frame === 1) c.setData({ air: true }) })
anim("odd", { frames: 2, fps: 10, w: 1, h: 1, genre: "fightin" }, (c) => c.px(0, 0, "r"))`, "t.px.js");
  const r = checkProject(p);
  assert.deepEqual(r.lines, [
    "step › WARNING: genre 'fighting': its feet aren't on one ground line: its lowest row is 5 (frames 0-1, 3), 4 (frame 2); a move keeps them on one row",
    "odd › WARNING: genre 'fightin' is no genre() here (did you mean 'fighting'?) (there are: fighting): its checks didn't run",
  ]);
  assert.match(r.coverage, /genres' checks on 9 frames/);
});

test("genre checks: a family stands as tall over its ground point in every direction (action top-down)", () => {
  // n drawn a px short; every direction hops a px on frame 1 (its tallest)
  const p = loadSource(PAL + `genre("td", { checks: ["height"] })
for (const [d, h] of [["s", 6], ["e", 6], ["n", 5], ["w", 6]]) anim("walk_" + d, { frames: 2, fps: 10, w: 3, h: 8, pivot: [1, 7], genre: "td" }, (c) => c.rect(1, 7 - h - c.frame, 1, h, "r"))
group("walk", ["walk_s", "walk_e", "walk_n", "walk_w"])
group("pair", ["walk_s", "walk_e"])`, "t.px.js");
  assert.deepEqual(checkProject(p).lines, ["walk › WARNING: genre 'td': its directions aren't one height: s 7, e 7, n 6, w 7 px over its ground point (the tallest frame of each); the same figure stands as tall whichever way it faces"]);
});

test("turnaround: a footprint box where the thing meets the ground at each heading; genre checks: the drawing reaches it (racing)", () => {
  const p = loadSource(PAL + `ramps("krw")
genre("racing", { checks: ["footprint"] })
turnaround("cube", sdf.box([1, 1, 1]).at(0, 0, 0.5), { view: { kind: "side", pitch: 0 }, ppm: 16, headings: ["n", "ne"], genre: "racing" })
turnaround("orb", sdf.sphere(0.5).at(0, 0, 1), { view: { kind: "side", pitch: 20 }, ppm: 8, headings: ["n"], genre: "racing" })
sprite("lifted", { w: 6, h: 6, genre: "racing" }, (c) => { c.rect(0, 0, 6, 3, "r"); c.setBox("footprint", 0, 5, 6, 1) })
sheet("cubes", ["cube"])`, "t.px.js");
  // seen level, its bottom face a line under its drawing's last row, as wide as it; turned 45 degrees, wider
  assert.deepEqual(p.image("cube_n").boxes, { footprint: [[6, 18, 16, 0]] });
  assert.deepEqual(p.image("cube_ne").boxes, { footprint: [[3, 18, 22, 0]] });
  assert.deepEqual(p.image("cube_ne").bounds(), { x: 3, y: 2, w: 22, h: 16 });
  assert.equal(p.assets.get("cube_ne")!.opts.genre, "racing");
  built(p, ["cubes"], (dir) => assert.deepEqual(json(dir, "cubes").frames.cube_n.boxes, { footprint: [{ x: 6, y: 18, w: 16, h: 0 }] }));
  assert.deepEqual(checkProject(p).lines, [
    "orb_n › WARNING: genre 'racing': it has no footprint (a box \"footprint\" where it meets the ground: a turnaround()'s in an orthographic view, or c.setBox)",
    "lifted › WARNING: genre 'racing': its drawing doesn't reach where it meets the ground: its lowest row is 2, its footprint's 5: drawn lifted, or its wheels or feet hidden or cut, it floats there",
  ]);
});
