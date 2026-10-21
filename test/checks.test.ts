import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSource } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";
import { main } from "../src/node/cli.ts";
import { frontWords, lightWords, litDir, rampSteps } from "../src/core/checks.ts";
import { PAL } from "./helpers.ts";

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
