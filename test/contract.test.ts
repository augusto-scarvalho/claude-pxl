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
  // genre(name): its data back, for a kit reading its profile's numbers
  assert.equal(keys(loadSource(PAL + `genre("g", { stand: 58 }); sprite("x", { w: 1, h: 1 }, px(0, 0, genre("g").stand === 58 && genre("g").name === "g" ? "r" : "k"))`, "t.px.js"), "x"), "r");
  assert.throws(() => loadSource(PAL + `genre("g", {}); genre("h")`, "t.px.js"), /genre 'h' is no genre\(\) defined before it/);
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

test("genre checks: its ink by category (a character near-black all round, \"own\" a line all round darker than its fill, its lit side named); a sprite's ink lines a drawing all round, one geometry every side, an L's elbow the fill's", () => {
  // a box lit from the upper left, its darkest along its lower right (a hand pass's line there: fill to the ink)
  const p = loadSource(PAL + `genre("td", { ink: { character: "#1a1620", prop: "own" } })
genre("said", { ink: "material" })
sprite("_box", { w: 8, h: 8 }, (c) => { c.rect(1, 1, 6, 6, "#e8763e"); c.rect(6, 1, 1, 6, "#6e2420"); c.rect(1, 6, 6, 1, "#6e2420") })
sprite("box", { base: "_box", ink: [["#4a0e02", "#832e24", "#6e2420", "#e8763e"]], genre: "td", category: "prop" })
sprite("bare", { base: "_box", genre: "td", category: "prop" })
sprite("guy", { base: "_box", genre: "td", category: "character" })
sprite("tile", { base: "_box", genre: "td", category: "ground" })
sprite("words", { base: "_box", genre: "said", category: "prop" })
sprite("step", { w: 8, h: 8, ink: [["#4a0e02", "#832e24", "#e8763e"]] }, (c) => { c.rect(1, 1, 4, 2, "#e8763e"); c.rect(1, 3, 6, 4, "#e8763e") })`, "t.px.js");
  // a px outside every side: the lighter line over it and left of it, the darker right of it and under it, its old line
  // on its lower right kept as fill (the line outside it: columns 1 and 8 round a box of 2..7)
  const im = p.image("box"), hex = (x: number, y: number) => "#" + (im.get(x, y) >>> 8).toString(16).padStart(6, "0");
  assert.deepEqual([im.w, im.h, hex(4, 1), hex(1, 4), hex(8, 4), hex(4, 8), hex(7, 4), im.get(9, 4), im.get(1, 1)], [10, 10, "#832e24", "#832e24", "#4a0e02", "#4a0e02", "#6e2420", 0, 0]);
  // round a step two px each way (its upper right cut), the line's elbow there the fill's: the line steps diagonally
  const st = p.image("step"), sh = (x: number, y: number) => "#" + (st.get(x, y) >>> 8).toString(16).padStart(6, "0");
  assert.deepEqual([sh(6, 3), sh(6, 2), sh(7, 3)], ["#e8763e", "#4a0e02", "#832e24"]);
  const r = checkProject(p);
  assert.equal(r.lines.length, 2, r.lines.join("\n"));
  assert.match(r.lines[0], /^bare › WARNING: genre 'td': a prop's edge is a line all round outside its fill.*but 45% of its edge isn't, 45% on its lit side \(up and left\) and 0% away from the light: 9 px no darker than inside it/);
  assert.match(r.lines[1], /^guy › WARNING: genre 'td': a character's edge is near-black all round.*but 100% of its edge isn't/);
  assert.match(r.coverage, /genres' ink by category on 3 frames/);
  assert.throws(() => loadSource(PAL + `sprite("x", { w: 4, h: 4, ink: [["#6e2420", "#832e24", "#e8763e"]] }, (c) => c.rect(1, 1, 2, 2, "#ffffff"))`, "t.px.js").image("x"), /ink: #ffffff at its edge is in none of its ramps/);
  assert.throws(() => loadSource(PAL + `sprite("x", { w: 1, h: 1, category: "prop" })`, "t.px.js"), /category is what it is by its genre's ink.*and no genre/);
});

test("genre checks: a family stands as tall over its ground point in every direction (action top-down)", () => {
  // n drawn a px short; every direction hops a px on frame 1 (its tallest)
  const p = loadSource(PAL + `genre("td", { checks: ["height"] })
for (const [d, h] of [["s", 6], ["e", 6], ["n", 5], ["w", 6]]) anim("walk_" + d, { frames: 2, fps: 10, w: 3, h: 8, pivot: [1, 7], genre: "td" }, (c) => c.rect(1, 7 - h - c.frame, 1, h, "r"))
group("walk", ["walk_s", "walk_e", "walk_n", "walk_w"])
group("pair", ["walk_s", "walk_e"])`, "t.px.js");
  assert.deepEqual(checkProject(p).lines, ["walk › WARNING: genre 'td': its directions aren't one height: s 7, e 7, n 6, w 7 px over its ground point (the tallest frame of each); the same figure stands as tall whichever way it faces"]);
});

test("genre checks: a rig3d() figure's height is its own, not the sword its hook raises over its head", () => {
  // the n view's sword stands 12 px over the head: the figure as tall in every direction
  const p = loadSource(PAL + `genre("td", { checks: ["height"] })
rig3d("f", { body: { h: 30, heads: 3 }, headings: ["s", "e", "n"], w: 20, h: 48, pivot: [10, 44], genre: "td", parts: (j) => ({ body: j.limb(j.pelvis, j.head, 3, 3, "w") }),
  moves: { cut: { frames: 1, pose: () => ({}), draw: (c, j) => { if (j.heading === 0) j.rod(j.head, [j.head[0], j.head[1], j.head[2] + 12], "r") } } } })`, "t.px.js");
  assert.ok(keys(p, "f_cut_n").includes("r"));
  assert.deepEqual(checkProject(p).lines, []);
  assert.deepEqual(p.image("f_cut_n").figure, p.image("f_cut_s").figure);
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
