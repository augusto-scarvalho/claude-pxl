import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSource } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";
import { main } from "../src/node/cli.ts";
import { frontWords, lightWords, litDir, rampSteps } from "../src/core/checks.ts";
import { PAL, failure } from "./helpers.ts";
import { lane, profile } from "../src/core/util.ts";

const run = async (src: string, ...args: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(file, src);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  let code: number;
  try { code = await main([args[0], file, ...args.slice(1)]); } finally { console.log = log; }
  return { text: lines.join("\n"), code, dir, file };
};

// a head with a nose to the right, lit from the top right: k outline, d body, 6 its lit edges, 1 the
// shaded ones
const HEAD = `sprite("head", { w: 11, h: 9, facing: "right", outline: "k", sockets: { front: [11, 4] } },
  rect(0, 0, 9, 9, "d"), rect(9, 2, 2, 4, "d"), relight(undefined, { light: [0.6, -1], reach: 2, ramps: ["1d6"] }))`;

test("check: a scene whose loop is cut at 60 s is said so, and only its first 600 frames are checked", () => {
  // 167 ms and 250 ms frames: a 1 ms step over 60 s, 60,000 frames; checked whole, it took hours
  const p = loadSource(PAL + `anim("a", { fps: 6, frames: 4, w: 1, h: 1 }, (c) => c.px(0, 0, "w"))
anim("b", { fps: 4, frames: 2, w: 1, h: 1 }, (c) => c.px(0, 0, "r"))
scene("s", { w: 2, h: 1 }, stamp("a", 0, 0), stamp("b", 1, 0))`, "t.px.js");
  const r = checkProject(p, { names: ["s"] });
  assert.match(r.lines.join("\n"), /s › WARNING: its loop doesn't close within 60 s: .*60000 frames\); checked its first 600 frames only/);
  assert.match(r.checked, /\(600 frames/);
});

test("front marker: on the half the label faces; off the drawing or on the back half is called out", () => {
  const p = loadSource(PAL + HEAD + `
sprite("head_wrong", { base: "head", facing: "left" })
sprite("head_off", { base: "head", sockets: { front: [0, -3] } })
sprite("herald", { w: 20, h: 9, facing: "right", outline: "k", sockets: { front: [7, 4] } }, rect(0, 0, 6, 9, "d"), hline(6, 4, 14, "6"))
sprite("stride", { w: 18, h: 28, facing: "right", outline: "k", sockets: { front: [9, 25] } }, rect(8, 0, 10, 8, "d"), line(10, 8, 3, 24, "d", 3), rect(1, 24, 8, 3, "d"))
sprite("blade", { w: 12, h: 12, outline: "k" }, line(0, 11, 11, 0, "d", 2), relight(undefined, { light: [0.6, -1], ramps: ["1d6"] }))`, "t.px.js");
  assert.equal(frontWords(p.image("head")), "front marker agrees");
  // the label says left, but the marker (the nose) is on the right half: the drawing faces right
  assert.match(frontWords(p.image("head_wrong")), /WARNING: its front marker is on its back half: the drawing faces right, its label says left/);
  assert.match(frontWords(p.image("head_off")), /WARNING: its front marker \(\d+,-?\d+\) is off the drawing/);
  // a trumpet held out in front stretches the box past the face; the face is still the front
  assert.equal(frontWords(p.image("herald")), "front marker agrees");
  // a leg reaching back: its mass is ahead of the toe, but the toe is the front of its foot
  assert.equal(frontWords(p.image("stride")), "front marker agrees");
  // a thin diagonal's top edges are its left ones: left and top can't be told apart, so x is left unsaid
  assert.equal(litDir(p.image("blade"))?.[0] ?? 0, 0);
});

test("light: the lit side read from the edges; a flipped copy is lit from the other side", () => {
  const p = loadSource(PAL + HEAD + `
sprite("head_l", { base: "head", flip: "x" })`, "t.px.js");
  const d = litDir(p.image("head"))!;
  assert.ok(d[0] > 0 && d[1] < 0, `lit from the top right, got ${d}`);
  assert.equal(lightWords(p.image("head"), [0.6, -1]), "lit from the top right, as its light");
  assert.match(lightWords(p.image("head_l"), [0.6, -1]), /^WARNING: lit from the top left, but its light comes from the top right/);
});

test("light: what an unlit layer holds (sparks, smears) isn't read for its lit side", async () => {
  // read in ramp steps, as in any scene: the palette needs the ramp the head was lit along
  const src = PAL + `ramps("1d6")
` + HEAD + `
sprite("head_l", { base: "head", flip: "x" })
scene("s", { w: 60, h: 20, bg: "d", world: { scale: 10, light: [0.6, -1] } },
  layer("solid", stamp("head_l", 10, 2)), layer("fx", { unlit: true }, stamp("head_l", 40, 2)))`;
  const { text } = await run(src, "describe", "s", "--no-out");
  assert.match(text, /head_l @solid[^]*?WARNING: lit from the top left/);
  assert.doesNotMatch(text.slice(text.indexOf("head_l @fx")), /^\s+.*WARNING: lit from/m);
});

test("light: a point light in the scene (a fire): each object checked against the way from it to the fire", async () => {
  // the head is lit from the right: right for a head left of the fire, wrong for one right of it;
  // the flipped head, lit from the left, is right on the fire's right
  const src = PAL + `ramps("1d6")
` + HEAD + `
sprite("head_l", { base: "head", flip: "x" })
sprite("fire", { w: 4, h: 4 }, rect(0, 0, 4, 4, "8"))
scene("s", { w: 60, h: 20, bg: "d", world: { scale: 10, light: { at: [30, 6] } } },
  layer("a", stamp("head", 5, 2)), layer("b", stamp("head_l", 40, 2)), layer("c", stamp("head", 44, 2)), layer("fire", stamp("fire", 28, 4)))`;
  const { text } = await run(src, "describe", "s", "--no-out");
  assert.match(text, /^LIGHT: a point at 30,6;/m);
  assert.match(text, /A head @a[^]*?lit from the top right, as its light\n {2}B /);
  assert.match(text, /B head_l @b[^]*?lit from the top left, as its light\n {2}C /);
  assert.match(text, /C head @c[^]*?WARNING: lit from the top right, but its light comes from the left[^\n]*\n {2}D fire/);
  assert.throws(() => loadSource(PAL + `scene("s", { w: 4, h: 4, world: { light: { at: 3 } } })`, "t.px.js"), /world\.light is where the light comes from, \[x, y\][^]*or a point light in the scene, \{ at: \[x, y\] \}/);
});

test("light: a blade shows two faces; the lit one has to look toward the light", () => {
  const lit = (name: string, line: string) => `sprite("${name}", { w: 26, h: 28, outline: "k" }, ${line}, relight(undefined, { light: [0.6, -1], reach: 1, ramps: ["1d6"] }))`;
  const p = loadSource(PAL + lit("lying", 'line(1, 14, 24, 2, "d", 3)') + "\n" + lit("steep", 'line(9, 26, 16, 1, "d", 3)') + `
sprite("steep_l", { base: "steep", flip: "x" })`, "t.px.js");
  // lying up and to the right, its upper face looks up and to the left: into a light from the top
  // right all the same (read by sides it would say "lit from the top left")
  assert.equal(lightWords(p.image("lying"), [0.6, -1]), "lit on its face toward the light");
  assert.equal(lightWords(p.image("steep"), [0.6, -1]), "lit on its face toward the light");
  // flipped, the lit face looks left and down, away from it
  assert.match(lightWords(p.image("steep_l"), [0.6, -1]), /^WARNING: lit on its face away from the light/);
});

test("describe: feet above where a thing stands, and off the ground", async () => {
  const { text } = await run(PAL + `sprite("man", { w: 3, h: 12, height: 1.8, pivot: [1.5, 12] }, rect(0, 0, 3, 9, "r"))
scene("s", { w: 30, h: 30, bg: "g", world: { scale: 5, ground: 26 } }, layer("props", stamp("man", 10, 26), stamp("man", 20, 24)))`, "describe", "s", "--no-out");
  // the sprite's last 3 rows are empty: its pivot is 3 px under its sole, so it floats
  assert.match(text, /man #1[^]*?WARNING: its feet are 3 px above where it stands \(its pivot is 3 px below its sole\): it floats/);
  assert.match(text, /man #2[^]*?WARNING: its feet \(y 21\) are 5 px above the ground \(y 26\)/);
});

test("c.as: what a function paints, a placement by name; an anim with a world checked as a scene", () => {
  const src = PAL + 'anim("a", { w: 8, h: 8, frames: 2, world: { light: [1, -1] } }, (c) => { c.rect(0, 0, 8, 8, "g"); c.as("box", () => { c.rect(2, 2, 3, 3, "r"); c.px(2, 2, "g") }, { height: 1 }) })';
  const p = loadSource(src, "t.px.js", { checksOnly: true }), q = p.build("a").placements.find((v) => v.name === "box")!;
  // what it changed: the pixel painted in the ground's own color isn't part of it
  assert.deepEqual([q.x, q.y, q.w, q.h, q.img.meters, q.img.data[0] === 0, q.img.data[1] !== 0], [2, 2, 3, 3, 1, true, true]);
  assert.equal(loadSource(src, "t.px.js").build("a").placements.length, 0, "drawing alone: nothing kept");
  assert.match(checkProject(p).checked, /1 scene \(2 frames/);
});

test("lane: along a polyline, rounded at its corners: how far along and to its right, carried on past its ends", () => {
  // east 100 px, then south 100 px (a right turn on the picture), the corner rounded 20 px
  const L = lane([0, 0, 100, 0, 100, 100], { round: 20 }), near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} != ${b}`);
  const [s0, u0] = L(50, 5);
  near(s0, 50, "on the first leg"); near(u0, 5, "south of an eastward leg is its right");
  // the bend: a quarter circle of 20 px round (80, 20), its middle 10 * pi / 4... along it
  const arc = (Math.PI / 2) * 20, [s1, u1] = L(80 + 20 * Math.SQRT1_2, 20 - 20 * Math.SQRT1_2);
  near(s1, 80 + arc / 2, "the bend's middle"); near(u1, 0, "on it");
  const [s2, u2] = L(80 + 30 * Math.SQRT1_2, 20 - 30 * Math.SQRT1_2);
  near(s2, s1, "outside the bend, the same course (a fan)"); near(u2, -10, "the outside of a right turn is its left");
  const [s3, u3] = L(95, 150);
  near(s3, 80 + arc + 130, "the last leg carried on"); near(u3, 5, "west of a southward leg is its right");
  near(L.total, 80 + arc + 80, "its length along");
  assert.throws(() => lane([0, 0]), /lane: points are/);
});

test("profile and world.ground as a polyline: its row under x; a stamp standing on it; feet read against it there", async () => {
  const floor = profile([0, 10, 10, 20, 20, 20]);
  assert.deepEqual([floor(-5), floor(0), floor(5), floor(15), floor(30)], [5, 10, 15, 20, 20], "the first leg carried on before it, the last row after");
  // a cave floor sloping down to the right: the first stands on it ("ground"), the second 4 px above it
  const { text } = await run(PAL + `sprite("man", { w: 3, h: 9, height: 1.8, pivot: [1, 9] }, rect(0, 0, 3, 9, "r"))
scene("s", { w: 30, h: 30, bg: "g", world: { scale: 5, ground: [0, 10, 30, 25] } }, layer("props", stamp("man", 6, "ground"), stamp("man", 20, 16)))`, "describe", "s", "--no-out");
  assert.doesNotMatch(text.split("A man #2")[0], /WARNING/);
  assert.match(text, /man #2[^]*?WARNING: its feet \(y 16\) are 4 px above the ground \(y 20\)/);
  // a ledge over the floor from x 15 to 25: the second stands on it; "ground" is the floor's
  const two = (await run(PAL + `sprite("man", { w: 3, h: 9, height: 1.8, pivot: [1, 9] }, rect(0, 0, 3, 9, "r"))
scene("s", { w: 30, h: 30, bg: "g", world: { scale: 5, ground: [[0, 10, 30, 25], [15, 16, 25, 16]] } }, layer("props", stamp("man", 6, "ground"), stamp("man", 20, 16), stamp("man", 5, 8)))`, "describe", "s", "--no-out")).text;
  assert.doesNotMatch(two.split("A man #3")[0], /WARNING/);
  assert.match(two, /man #3[^]*?WARNING: its feet \(y 8\) are 5 px above the ground \(y 13\)/, "the ledge only over its span");
  assert.match(failure(PAL + 'sprite("d", "r"); scene("s", { w: 4, h: 4 }, stamp("d", 1, "ground"))', "s").message, /stands on the scene's ground: give it world/);
});

test("rig turn: the mirrored rig takes its own part when drawn, else the original's flipped; the retouch mirrors too", async () => {
  const src = PAL + `rig("man", { w: 8, h: 4, facing: "right", guide: false, turn: "man_l", light: [0.6, -1], slots: {
  body: { at: [2, 0], size: [3, 4], pivot: [0, 0] }, nose: { at: [5, 1], size: [1, 1], pivot: [0, 0] } } }, px(0, 0, "w"))
sprite("man_body", { w: 3, h: 4 }, rect(0, 0, 3, 4, "r"))
sprite("man_nose", { w: 1, h: 1 }, px(0, 0, "k"))
sprite("man_l_nose", { w: 1, h: 1 }, px(0, 0, "g"))`;
  const p = loadSource(src, "t.px.js"), rev = p.assets.get("man")!.pal.reverse();
  const row = (n: string, y: number) => { const im = p.image(n); return [...Array(im.w).keys()].map((x) => rev.get(im.data[y * im.w + x]) ?? ".").join(""); };
  assert.equal(row("man", 0), "w.rrr...");
  assert.equal(row("man", 1), "..rrrk..");
  // turned: body mirrored to x 3-5, its own nose (g) at x 2, the retouch's corner pixel at x 7
  assert.equal(row("man_l", 0), "...rrr.w");
  assert.equal(row("man_l", 1), "..grrr..");
  assert.equal(p.image("man_turnaround").w, 20);
  const { text } = await run(src, "describe", "man_l", "--no-out");
  assert.match(text, /RIG \(facing left, turned from 'man'/);
  assert.match(text, /body: [^\n]*drawn 'man_body' flipped \(no 'man_l_body' of its own\)/);
  assert.match(text, /nose: [^\n]*drawn 'man_l_nose'/);
});

test("rig turn with a part-name map: slots that name shared parts look them up under the other prefix", () => {
  // two rigs (poses) share the parts kit_body and kit_nose; turned, each finds kit_l_<part>, else flips
  const src = PAL + `const slots = { body: { at: [2, 0], size: [3, 4], pivot: [0, 0], part: "kit_body" }, nose: { at: [5, 1], size: [1, 1], pivot: [0, 0], part: "kit_nose" } }
rig("pose_a", { w: 8, h: 4, facing: "right", guide: false, turn: { name: "pose_a_l", parts: ["kit_", "kit_l_"] }, slots })
sprite("kit_body", { w: 3, h: 4 }, rect(0, 0, 3, 4, "r"))
sprite("kit_nose", { w: 1, h: 1 }, px(0, 0, "k"))
sprite("kit_l_nose", { w: 1, h: 1 }, px(0, 0, "g"))`;
  const p = loadSource(src, "t.px.js"), rev = p.assets.get("pose_a")!.pal.reverse();
  const row = (n: string, y: number) => { const im = p.image(n); return [...Array(im.w).keys()].map((x) => rev.get(im.data[y * im.w + x]) ?? ".").join(""); };
  assert.equal(row("pose_a", 1), "..rrrk..");
  // its own nose (kit_l_nose, g); no kit_l_body, so kit_body flipped
  assert.equal(row("pose_a_l", 1), "..grrr..");
  assert.throws(() => loadSource(PAL + `rig("x", { w: 4, h: 4, facing: "right", turn: { name: "x_l", parts: ["a"] }, slots: { b: { at: [0, 0], size: [1, 1] } } })`, "t.px.js"), /turn\.parts maps part names by prefix/);
});

test("pxl blind: shuffled unnamed images and a key; --check compares a reader's answers", async () => {
  const src = PAL + HEAD + `
sprite("head_l", { base: "head", flip: "x" })`;
  const { text, dir, file } = await run(src, "blind", "head", "head_l");
  assert.match(text, /2 images in .*_blind/);
  const key = JSON.parse((await import("node:fs")).readFileSync(join(dir, "out", "_blind", "key.json"), "utf8")) as { n: number; name: string; facing: string }[];
  assert.deepEqual(key.map((k) => k.facing).sort(), ["left", "right"]);
  const answers = Object.fromEntries(key.map((k) => [String(k.n), k.name === "head" ? "right" : "right"]));
  writeFileSync(join(dir, "answers.json"), JSON.stringify(answers));
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["blind", file, "--check", join(dir, "answers.json")]), 1); } finally { console.log = log; }
  assert.match(lines.join("\n"), /head_l: labelled left, the reader says right: look at it\n1 of 2 labels agree/);
});

// a body with an arm on its left and a shield in that hand: the shield's outer face (o) and inner
// face (i), its strap along the arm's forearm
const SHIELDED = (facing: string, strap = "[1.5, 0]") => PAL + `rig("man", { w: 12, h: 8, facing: "${facing}", guide: false, turn: "man_l", slots: {
  body: { at: [6, 0], size: [2, 8], pivot: [1, 0] },
  arm: { at: [6, 1], size: [1, 4], pivot: [0, 0], side: "l" },
  shield: { at: [0, 0], size: [3, 3], side: "l", out: 10, on: "arm.hand", faces: { outer: "man_shield", inner: "man_shield_in" },
    parallel: ["strap", "grip", "arm.elbow", "arm.hand"] } } })
sprite("man_body", { w: 2, h: 8 }, rect(0, 0, 2, 8, "w"))
sprite("man_arm", { w: 1, h: 4, sockets: { elbow: [0.5, 0.5], hand: [0.5, 3.5] } }, rect(0, 0, 1, 4, "r"))
sprite("man_shield", { w: 3, h: 3, pivot: [1.5, 1.5], sockets: { strap: ${strap}, grip: [1.5, 1.5] } }, rect(0, 0, 3, 3, "g"))
sprite("man_shield_in", { w: 3, h: 3, pivot: [1.5, 1.5], sockets: { strap: ${strap}, grip: [1.5, 1.5] } }, rect(0, 0, 3, 3, "k"))`;

test("rig faces, out and on: the face turned to us, outside the arm, hung from the hand", async () => {
  const p = loadSource(SHIELDED("right"), "t.px.js"), rev = p.assets.get("man")!.pal.reverse();
  const row = (n: string, y: number) => { const im = p.image(n); return [...Array(im.w).keys()].map((x) => rev.get(im.data[y * im.w + x]) ?? ".").join(""); };
  // facing right, its left side is far: the shield shows its inner face (k), behind the arm and the
  // body (w), centred on the hand; only its right column shows past the body
  assert.equal(row("man", 4), ".....wwk....");
  // facing left (turned), its left side is near: the arm (r) over the body, the outer face (g) over both
  assert.equal(row("man_l", 1), ".....rw.....");
  assert.equal(row("man_l", 4), "....ggg.....");
  const { text } = await run(SHIELDED("right"), "describe", "man", "--no-out");
  assert.match(text, /shield: [^\n]*drawn 'man_shield_in'; shows its inner face; hangs from arm\.hand; its strap-grip runs parallel to arm's elbow-hand \(0 deg apart\)/);
  const bad = await run(SHIELDED("right", "[0, 0]"), "describe", "man", "--no-out");
  assert.match(bad.text, /WARNING: its strap-grip is 45 deg off arm's elbow-hand: they should run parallel/);
});

test("light words: a weak side or a light from below claims nothing", () => {
  const p = loadSource(PAL + `ramps("1d6")
sprite("lit", { w: 9, h: 9, outline: "k" }, rect(0, 0, 9, 9, "d"), relight(undefined, { light: [0.6, -1], reach: 2 }))
sprite("below", { base: "lit", flip: "y" })`, "t.px.js");
  const st = rampSteps(p.assets.get("lit")!.pal);
  assert.equal(lightWords(p.image("lit"), [0.6, -1], st), "lit from the top right, as its light");
  // lit from below while the light is above: noise, not light, so nothing is claimed
  assert.equal(lightWords(p.image("below"), [0.6, -1], st), "");
});

test("checksOnly: the same check, without the whole-image passes no check reads", () => {
  // a lamp-lit scene: lighting changes its pixels, not what was placed or how it reads
  const src = PAL + `ramps("1d6")
` + HEAD + `
sprite("head_l", { base: "head", flip: "x" })
scene("s", { w: 40, h: 14, bg: "d", world: { scale: 10, light: [0.6, -1] } },
  stamp("head", 2, 2), stamp("head_l", 20, 2), lamp(10, 6, { r: 12 }), lighting({ cell: 1, ambient: 0.3 }), glow("6", { r: 3 }))`;
  const full = loadSource(src, "t.px.js"), quick = loadSource(src, "t.px.js", { checksOnly: true });
  assert.notDeepEqual([...quick.image("s").data], [...full.image("s").data], "the light isn't drawn");
  const text = (p: ReturnType<typeof loadSource>) => { const r = checkProject(p); return [...r.lines, r.checked, r.coverage].join("\n"); };
  assert.equal(text(quick), text(full));
  assert.match(text(full), /head_l @-[^\n]*WARNING: lit from the top left/);
});

test("check --readings: what the lit-side rule read on every placement, warning or not, and a tally", () => {
  const src = PAL + `ramps("1d6")
` + HEAD + `
sprite("head_l", { base: "head", flip: "x" })
scene("s", { w: 60, h: 14, bg: "d", world: { scale: 10, light: [0.6, -1] } }, stamp("head", 2, 2), stamp("head_l", 30, 2))`;
  const r = checkProject(loadSource(src, "t.px.js"), { readings: true });
  assert.deepEqual(r.readings, ["s › head @- › lit from the top right, as its light", "s › head_l @- › WARNING: lit from the top left, but its light comes from the top right (a flipped drawing carries its light to the other side)"]);
  assert.equal(r.tally, "2 placements read: 1 lit as their light, 1 against it, 0 with no side to tell");
  assert.equal(checkProject(loadSource(src, "t.px.js")).readings, undefined, "only when asked");
});

test("lit side without world.light: against the lamp lighting() lit it by, or a mesh's light; light: false reads none", () => {
  const scene = (lamps: string, world = "") => PAL + `ramps("1d6")\n` + HEAD + `\nscene("s", { w: 60, h: 30, bg: "d"${world} }, stamp("head", 20, 12), ${lamps}, lighting({ cell: 1, ambient: 0.3 }))`;
  const read = (src: string) => checkProject(loadSource(src, "t.px.js", { checksOnly: true }), { readings: true });
  assert.deepEqual(read(scene("lamp(40, 2, { r: 40 })")).readings, ["s › head @- › lit from the top right, as its light"]);
  // the strongest at its middle: a far weak lamp on the other side doesn't count
  assert.match(read(scene("lamp(2, 2, { r: 40 }), lamp(58, 28, { r: 6 })")).readings![0], /WARNING: lit from the top right, but its light comes from the top left/);
  const off = read(scene("lamp(2, 2, { r: 40 })", ", world: { light: false }"));
  assert.deepEqual([off.lines, off.readings], [[], []]);
  assert.match(off.coverage, /not run: lit side/);
  // a sprite in mesh(): the mesh's light (by default from the upper left, behind the eye) through its camera
  const m = read(PAL + `ramps("1d6")\n` + HEAD + `\nconst G = model(); G.face("g", [-5, 1, 0], [5, 1, 0], [5, 9, 0], [-5, 9, 0])
scene("s", { w: 60, h: 40, bg: "d" }, (c) => c.mesh({ w: 60, horizon: 8, eye: 1.6, focal: 40 }, G.faces, { g: { ramp: "1d6" } }, { sprites: [{ name: "head", at: [0, 4] }] }))`);
  assert.match(m.readings![0], /s › head @- › WARNING: lit from the top right, but its light comes from the (top )?left/);
});

test("check: a hand-drawn sprite's 1 px lines, L-corners and jaggies with where, to look at; line() and outline8 aren't asked", () => {
  // a shallow line by hand, one step doubled (x 6), the others clean; the same by line(); a grid
  // drawn square on purpose
  const rows = ["kk..............", "..kk............", "....kkk.........", "......kkk.......", ".........kkk....", "............kkkk"].join("\n");
  const p = loadSource(PAL + `sprite("hand", \`\n${rows}\`)
sprite("ruled", { w: 16, h: 6 }, line(0, 0, 15, 5, "k"))
sprite("square", { outline8: "k" }, \`\n${rows}\`)
sprite("_part", \`\n${rows}\`)`, "t.px.js");
  const r = checkProject(p);
  // things to look at, not warnings: a corner is often meant (a tyre, a roof), so check doesn't fail on them
  assert.deepEqual(r.notes.map((l) => l.slice(0, l.indexOf(":", l.indexOf("LOOK") + 5))), ["hand › LOOK: 1 L-corner in its 1 px lines (at 6,2)", "_part › LOOK: 1 L-corner in its 1 px lines (at 6,2)"]);
  assert.equal(r.warnings, 0);
  assert.match(r.coverage, /lines on 2;/, "the hand-drawn ones, a part too");
});

test("check: two tones side by side too close to tell apart, in a sprite drawn by hand, to look at", () => {
  const p = loadSource(`pal({ k: "#1b1630", g: "#8ccf63", h: "#8ad066", r: "#e2585e" })
sprite("leaf", "gh\\ngg")
sprite("apart", "gr\\nrh")`, "t.px.js");
  const r = checkProject(p);
  assert.deepEqual(r.notes, ["leaf › LOOK: 1 pair of tones side by side too close to tell apart (under 0.03 in OKLab): 'h' #8ad066 and 'g' #8ccf63 (0.003); merge each, or spread it if both are meant"]);
  assert.equal(r.warnings, 0);
});

test("check: { every: n } checks one frame in n of a long scene; a bad n is said", () => {
  const src = `anim("a", { w: 2, h: 2, frames: 8, fps: 10 }, (c) => c.rect(0, 0, 2, 2, "r"))
scene("s", { w: 8, h: 8, frames: 8, fps: 10, check: { every: 4 } }, (c) => c.stamp("a", c.frame % 6, 2))`;
  assert.match(checkProject(loadSource(PAL + src, "t.px.js"), {}).checked, /1 scene \(2 frames/);
  assert.throws(() => checkProject(loadSource(PAL + src.replace("every: 4", "every: 0"), "t.px.js"), {}), /check: \{ every \}/);
});

// a yard: a box (x 7-12 at 10), a post (x 21-22 at 22) and a second box named crate, in a layer sorted by y
const yard = (rules: string, props = `stamp("box", 10, 40), stamp("post", 22, 40), stamp("box", ...AT.crate, { id: "crate" })`, crate = "[30, 40]", opts = "world: { ground: 40 }") => PAL + `
sprite("box", { w: 6, h: 6, pivot: "bottom" }, rect(0, 0, 6, 6, "r"))
sprite("post", { w: 2, h: 8, pivot: "bottom" }, rect(0, 0, 2, 8, "k"))
const AT = { crate: ${crate} }
scene("yard", { w: 64, h: 48, ${opts}, expect: [${rules}] },
  layer("props", { sort: "y" }, ${props}))`;
const RULES = `{ beside: ["box", "post", { gap: [2, 4], side: "left" }] }, { before: ["crate", "box"] }, { apart: ["crate", "post", 3] },
  { inside: ["box", [0, 0, 32, 48]] }, { onGround: ["post"] }`;

test("expect: a 2D scene's rules on its placements (by id, or an asset placed once) run by check with the numbers; --fix moves one, written where its number is", async () => {
  // the box 8 px left of the post, wanted 2-4; the rest hold (the crate is the other box, by its id)
  const r = checkProject(loadSource(yard(RULES), "t.px.js"));
  assert.deepEqual(r.lines, ["yard › WARNING: expect box left of post, 2-4 px apart: it doesn't hold (the gap is 8 px, wanted 2-4)"]);
  assert.match(r.coverage, /expects 5 \(4 held\)/);
  // over a loop (a box moving right 10 px a frame): a span of it, and one rule wherever another holds
  const loop = checkProject(loadSource(yard(`{ beside: ["mover", "post", { side: "left" }], frames: [0, 1] }, { while: [{ apart: ["mover", "post", 20] }, { beside: ["mover", "post", { side: "left" }] }] }`,
    `(c) => c.stamp("box", 4 + 10 * c.frame, 40, { id: "mover" }), stamp("post", 22, 40)`, "[30, 40]", "frames: 4"), "t.px.js"));
  assert.deepEqual(loop.lines, ["yard › WARNING: expect mover apart from post, 20 px or more while mover left of post: it doesn't hold (at frame 0 mover left of post holds and mover apart from post, 20 px or more doesn't: the gap is 14 px, wanted 20 or more) (frames 0-1)"]);
  // a name for two placements, a rule's shape and an onGround with no ground are said
  assert.match(checkProject(loadSource(yard(RULES, `stamp("box", 10, 40), stamp("post", 22, 40), stamp("box", 30, 40)`), "t.px.js")).lines.join("\n"), /'box' is placed 2 times: give the one the rule means an id/);
  assert.throws(() => loadSource(yard(`{ beside: ["box", "post", { side: "west" }] }`), "t.px.js"), /expect: beside side is "left", "right", "above", "below"/);
  assert.throws(() => loadSource(yard(RULES, undefined, undefined, "world: {}"), "t.px.js"), /onGround stands on the scene's world.ground/);
  // --fix: the box's own x (+4, the fewest px), the crate's y in AT's table (past the box's 40: in front), the post's y computed in
  // code, said and left; written once the scene rebuilt with them holds what it should
  const f = await run(yard(RULES, `stamp("box", 10, 40), stamp("post", 22, 40 - 3), stamp("box", ...AT.crate, { id: "crate" })`, "[30, 38]"), "check", "--fix");
  assert.match(f.text, /fix: box left of post, 2-4 px apart: box's x \+4 px\nfix: crate in front of box: crate's y \+3 px\nfix: post on the ground: post's y \+2 px would make it hold, but its y is computed in code \(`40 - 3` at a\.px\.js:7:\d+\): change it by hand\nfix: wrote crate's y 38 -> 41 \(a\.px\.js:4\), box's x 10 -> 14 \(a\.px\.js:7\); check again/);
  assert.match(readFileSync(f.file, "utf8"), /const AT = \{ crate: \[30, 41\] \}[^]*stamp\("box", 14, 40\)/);
  // a number two placements share (the flag's y is the crate's): rebuilt, the crate's rule that the fix held fails, so nothing is written
  const g = await run(yard(`{ beside: ["crate", "post", { gap: [1, 2], side: "right" }] }, { apart: ["flag", "box", 14] }, { beside: ["post", "box", { gap: [6, 9] }] }`,
    `stamp("box", 10, 40), stamp("post", 18 + 4, 40), stamp("box", ...AT.crate, { id: "crate" }), stamp("post", AT.crate[0] - 6, AT.crate[1], { id: "flag" })`), "check", "--fix");
  assert.match(g.text, /fix: not written: rebuilt with flag's y 40 -> 20 .*, yard › crate right of post, 1-2 px apart doesn't hold/);
  assert.match(readFileSync(g.file, "utf8"), /crate: \[30, 40\]/);
});

// a crate (a roof's triangle, x 14-24 at 20), things placed by relations to it, a path along y 30
const placedBy = (crateX: number, rules = "", more = "") => PAL + `
sprite("box", { w: 6, h: 6, pivot: "bottom" }, rect(0, 0, 6, 6, "r"))
sprite("post", { w: 2, h: 8, pivot: "bottom" }, rect(0, 0, 2, 8, "k"))
sprite("roof", { w: 12, h: 6, pivot: "bottom" }, poly([0, 6, 6, 0, 12, 6], "g"))
const PATH = [4, 30, 60, 30]
scene("yard", { w: 64, h: 48, world: { ground: 44 }, expect: [${rules}] },
  layer("props", { sort: "y" }, stamp("roof", ${crateX}, 44, { id: "crate" }),
    stamp("box", { beside: ["crate", "left", 3], id: "pot" }), stamp("box", { beside: ["crate", "above", 1], id: "lid" }),
    stamp("post", 2, 0, { on: "crate", id: "flag" }), stamp("post", { on: "pot", id: "pole" }), stamp("box", { along: [PATH, 16], id: "stone" }),
    stamp("box", 22, 44, { apart: ["crate", 1], id: "pushed" }), stamp("post", 50, 0, { on: "ground", id: "stake" })${more}))`;

test("stamp by a relation (beside, on, along, apart): it follows what it's placed by; x, y an offset; --fix changes the relation's number", async () => {
  const boxes = (src: string): Record<string, string> => {
    const b = loadSource(src, "t.px.js").build("yard");
    return Object.fromEntries(b.placements.map((p) => { const r = p.img.bounds()!; return [p.id, [p.x + r.x, p.y + r.y, p.x + r.x + r.w - 1, p.y + r.y + r.h - 1].join(",")]; }));
  };
  // a box 3 px left of the crate, their bottoms on one row; one above it 1 px up, middles in line; a post on
  // its slope 2 px right of its peak (one row lower) and one on the box; one 16 px along the path; one
  // pushed out of the crate's box the shorter way (1 px clear); one on the ground at x 50
  const at = boxes(placedBy(20));
  assert.deepEqual({ ...at }, { crate: "14,38,24,43", pot: "5,38,10,43", lid: "17,31,22,36", flag: "21,32,22,39", pole: "7,30,8,37", stone: "17,24,22,29", pushed: "26,38,31,43", stake: "49,36,50,43" });
  // the crate moved 10 px right: what is beside it or on it follows; the path's and the ground's stay
  const moved = boxes(placedBy(30)), dx = (k: string) => +moved[k].split(",")[0] - +at[k].split(",")[0];
  assert.deepEqual(["pot", "lid", "flag", "pole", "stone", "stake"].map(dx), [10, 10, 10, 10, 0, 0]);
  // over a loop: beside a flame that grows (its box at its own frame 0), a box stands still; beside one
  // moving 10 px a frame, it moves with it
  const loop = (f: number) => { const b = loadSource(PAL + `anim("flame", { w: 4, h: 8, frames: 4, pivot: "bottom" }, (c) => c.rect(0, 8 - 2 * (c.frame + 1), 4 + (c.frame % 2), 2 * (c.frame + 1), "r"))
sprite("box", { w: 6, h: 6, pivot: "bottom" }, rect(0, 0, 6, 6, "r"))
scene("s", { w: 96, h: 48, frames: 4 }, stamp("flame", 10, 40, { id: "fire" }), stamp("box", { beside: ["fire", "right", 2], id: "pot" }),
  (c) => c.stamp("box", 30 + 10 * c.frame, 40, { id: "cart" }), stamp("box", { beside: ["cart", "right", 1], id: "trailer" }))`, "t.px.js").build("s", 0, f * 125);
    return Object.fromEntries(b.placements.map((p) => [p.id, p.x]));
  };
  assert.deepEqual([0, 1, 2, 3].map((f) => [loop(f).pot, loop(f).trailer - loop(f).cart]), [[14, 7], [14, 7], [14, 7], [14, 7]]);
  assert.deepEqual([0, 1, 2, 3].map((f) => loop(f).trailer), [34, 44, 54, 64]);
  assert.throws(() => boxes(placedBy(20, "", `, stamp("box", { beside: ["shed", "left"] })`)), /beside: nothing stamped as 'shed' yet/);
  assert.throws(() => boxes(placedBy(20, "", `, stamp("box", { beside: ["crate", "west"] })`)), /beside is \[id, "left" \| "right" \| "above" \| "below", gap px\]/);
  // --fix: the box's beside gap (its relation's, before where it stands), the stone's s along the path
  // (the pole on the box moved with it, and the stone's fix counted that), checked rebuilt and written
  const f = await run(placedBy(20, `{ beside: ["pot", "crate", { gap: [5, 7], side: "left" }] }, { beside: ["stone", "pole", { gap: [2, 4], side: "right" }] }`), "check", "--fix");
  assert.match(f.text, /fix: pot left of crate, 5-7 px apart: pot's beside gap \+2 px\nfix: stone right of pole, 2-4 px apart: stone's along s -6 px\nfix: wrote stone's along s 16 -> 10 \(a\.px\.js:\d+\), pot's beside gap 3 -> 5 \(a\.px\.js:\d+\); check again/);
  assert.match(readFileSync(f.file, "utf8"), /beside: \["crate", "left", 5\][^]*along: \[PATH, 10\]/);
});

