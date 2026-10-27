// Detail in screen px (the library's F2c): a builder's texture at the ppm it is drawn at, surface()'s
// tones and ink, the foliage brush, decals lit by the surface under them, sdf.scatter's points, frozen
// cells, headings by degrees, a chibi's arms against its body.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keys, PAL } from "./helpers.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { checkProject } from "../src/node/check.ts";
import { PX, tree } from "../src/core/builders.ts";
import { scatter } from "../src/core/scatter.ts";
import { sdf } from "../src/core/sdf.ts";
import { bodyOf } from "../src/core/rig3d.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/detail.test.ts");

test("make3d.tree given its ppm: leaves a 3 px brush, none nearer than make3d.px.cluster; without it the meters it had", () => {
  assert.deepEqual([tree({ leaves: 28 }).details.leaves.count, tree({ leaves: 28 }).details.leaves.size], [28, 0.1]);
  const at = (ppm: number) => tree({ leaves: 28, ppm }).details.leaves;
  assert.deepEqual([at(9).count, at(9).size], [(9 / PX.cluster) ** 2, PX.leaf / 9], "sparse where the grid is coarse");
  assert.deepEqual([at(72).count, at(72).size], [28, PX.leaf / 72], "as many as asked where it's fine, still 3 px");
  assert.equal(keys(loadSource(PAL + `sprite("a", { w: make3d.px.grain, h: 1 }, rect(0, 0, 2, 1, "r"))`, "t.px.js"), "a"), "rr", "make3d.px in an art file");
});

const BALL = PAL + `ramps("krgw")
const B = sdf.sphere(0.5).at(0, 0, 0.5), O = { view: { kind: "side", pitch: 0 }, ppm: 16, at: [12, 21], mats: { "": "krgw" }, outline: false }
`;
test("surface: tones cuts each ramp to that many (its ends kept); ink a line all round outside it, as a 2D outline", () => {
  const p = loadSource(BALL + `sprite("all", { w: 24, h: 24 }, surface(B, O))
sprite("two", { w: 24, h: 24 }, surface(B, { ...O, tones: 2 }))
sprite("ink", { w: 24, h: 24 }, surface(B, { ...O, ink: "k" }))
sprite("ink2d", { base: "all", outline: "k" })`, "t.px.js");
  assert.ok(new Set(keys(p, "all").replace(/[.\n]/g, "")).size > 2);
  assert.deepEqual([...new Set(keys(p, "two").replace(/[.\n]/g, ""))].sort(), ["k", "w"]);
  // the 2D outline grows the box a px each way: cut back, the same pixels
  assert.equal(keys(p, "ink"), keys(p, "ink2d").split("\n").slice(1, -1).map((r) => r.slice(1, -1)).join("\n"));
});

test("foliage: tufts stepped from the tone under them, in rows step apart; none on the ramp's darkest or off it; vary keeps a seed's", () => {
  const p = loadSource(PAL + `sprite("f", { w: 6, h: 4 }, rect(0, 0, 6, 4, "g"), rect(0, 3, 6, 1, "k"), foliage("krgw", { tufts: ["+"], step: [2, 2], vary: 0 }))
sprite("v1", { w: 24, h: 12 }, rect(0, 0, 24, 12, "r"), foliage("krgw", { step: [4, 3], seed: 2 }))
sprite("v2", { w: 24, h: 12 }, rect(0, 0, 24, 12, "r"), foliage("krgw", { step: [4, 3], seed: 2 }))
sprite("v3", { w: 24, h: 12 }, rect(0, 0, 24, 12, "r"), foliage("krgw", { step: [4, 3], seed: 3 }))`, "t.px.js");
  assert.equal(keys(p, "f"), "wgwgwg\ngggggg\ngwgwgw\nkkkkkk");
  assert.equal(keys(p, "v1"), keys(p, "v2"));
  assert.notEqual(keys(p, "v1"), keys(p, "v3"));
  assert.match(String((() => { try { loadSource(PAL + `sprite("x", { w: 2, h: 2 }, foliage("krgw", { tufts: ["+x"] }))`, "t.px.js").image("x"); } catch (e) { return e; } })()), /\+ \(a tone up\)/);
});

const LIT = BALL + `sprite("dot", { pivot: "center" }, "rrr\\nrgr\\nrrr")
const D = { on: B, point: [0, -0.5, 0.5], view: O.view, ppm: O.ppm, at: O.at }
`;
test("decal: lit \"surface\" steps each texel from the tone under it (its commonest as it is); glow apart from lit; wrap's size in px", () => {
  const p = loadSource(LIT + `sprite("bare", { w: 24, h: 24 }, surface(B, O))
sprite("on", { w: 24, h: 24 }, surface(B, O), decal("dot", { ...D, lit: "surface" }))
sprite("glow", { w: 24, h: 24 }, surface(B, O), decal("dot", { ...D, lit: false }))
sprite("still", { w: 24, h: 24 }, surface(B, O), decal("dot", { ...D, lit: false, glow: false }))
sprite("m", { w: 24, h: 24 }, surface(B, { ...O, ppm: 32, at: [12, 23] }), decal("dot", { ...D, ppm: 32, at: [12, 23], mode: "wrap" }))
sprite("px", { w: 24, h: 24 }, surface(B, { ...O, ppm: 32, at: [12, 23] }), decal("dot", { ...D, ppm: 32, at: [12, 23], mode: "wrap", size: "px" }))
sprite("plain32", { w: 24, h: 24 }, surface(B, { ...O, ppm: 32, at: [12, 23] }))`, "t.px.js");
  const a = keys(p, "bare"), b = keys(p, "on"), diff = [...a].filter((ch, i) => ch !== b[i]);
  // only the middle texel, a step lighter than what is under it ("rrr" is the art's commonest: as the surface)
  assert.equal(diff.length, 1);
  assert.equal("krgw".indexOf(b[[...a].findIndex((ch, i) => ch !== b[i])]), "krgw".indexOf(a[[...a].findIndex((ch, i) => ch !== b[i])]) + 1);
  assert.ok(p.image("glow").emit?.some((v) => v > 0));
  assert.equal(p.image("still").emit?.some((v) => v > 0) ?? false, false);
  assert.equal(keys(p, "still"), keys(p, "glow"));
  // at 32 px a meter: a 3 texel decal 3/16 m across is 6 px; a texel to a px, 3
  const changed = (n: string) => [...keys(p, "plain32")].filter((ch, i) => ch !== keys(p, n)[i]).length;
  assert.ok(changed("m") > 2 * changed("px"), `${changed("m")} px against ${changed("px")}`);
});

test("sdf.scatter's points(): where each stands on the field as it is, its moves applied (a decal's point)", () => {
  const got = scatter(sdf.sphere(0.5).at(0, 0, 2), { count: 40, size: 0.02 }).points();
  assert.ok(got.length > 10);
  for (const q of got) {
    assert.ok(Math.abs(Math.hypot(q.p[0], q.p[1], q.p[2] - 2) - 0.5) < 0.03, `on the ball at z 2: ${q.p}`);
    assert.ok(q.n[0] * q.p[0] + q.n[1] * q.p[1] + q.n[2] * (q.p[2] - 2) > 0.4, "its normal out of the ball");
  }
});

test("frozen: the build writes the PNG when it isn't there, then reads it; pxl check says when the live render drifts", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-frozen-")), file = join(dir, "t.px.js");
  const src = (k: string) => PAL + `sprite("_live", { w: 3, h: 2, pivot: "bottom" }, rect(0, 0, 3, 2, "r"), px(1, 0, "${k}"))
sprite("cell", { png: "cell.png", frozen: "_live" })
sprite("brushed", { base: "cell" }, px(0, 0, "g"))`;
  try {
    writeFileSync(file, src("w"));
    let p = loadProject(file);
    writeOutputs(p, join(dir, "out"), { preview: false });
    assert.ok(existsSync(join(dir, "cell.png")));
    writeFileSync(file, src("k"));
    p = loadProject(file);
    assert.deepEqual([keys(p, "cell"), keys(p, "brushed"), p.image("cell").pivot], ["rwr\nrrr", "gwr\nrrr", [1.5, 2]], "the PNG, not the new live render; the live one's pivot");
    assert.match(checkProject(p).lines.join("\n"), /cell › WARNING: frozen: its live render '_live' drifted from cell\.png: 1 px differ/);
    writeFileSync(file, src("w"));
    assert.equal(checkProject(loadProject(file)).lines.length, 0);
    assert.match(String((() => { try { loadSource(PAL + `sprite("_l", { w: 1, h: 1 }); sprite("c", { png: "c.png", frozen: "_l", outline: "k" })`, "t.px.js"); } catch (e) { return e; } })()), /frozen names the asset its png is a render of.*not outline/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rig3d's default body: at few heads the arms hang against the torso; the traveler's 3 heads as they were", () => {
  const chibi = bodyOf({ h: 24, heads: 2.5 }), trav = bodyOf({ h: 34, heads: 3 });
  assert.ok(chibi.shoulders[1] <= chibi.r.body[1] + chibi.r.arm[0] + 1e-9, `${chibi.shoulders[1]}`);
  assert.equal(trav.shoulders[1], 6 - 1.1);
});
