import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cameraPath } from "../src/core/camera.ts";
import { route } from "../src/core/vfx.ts";
import { decodePng } from "../src/node/png.ts";
import { describe } from "../src/core/describe.ts";
import { loadSource } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";
import { art, failure, PAL, said } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/camera.test.ts");

// a 100x60 window onto a 1000x200 world, at 60 fps, every behaviour off but the one tested
const VIEW: [number, number] = [100, 60], MS = 1000 / 60;
const path = (o: object, target: (f: number) => unknown[] | null, n = 120) => {
  const cam = cameraPath({ world: [1000, 200], ahead: 0, ease: 1, speed: 1000, snap: false, ...o }, VIEW, MS, target);
  return Array.from({ length: n }, (_, f) => cam(f));
};

test("camera window: the camera moves only when the target leaves the box round the rest point, then keeps it on the box's edge", () => {
  // rest [50, 30] on the picture, a box 20 x 20: the target paces 8 px either way and the camera stays
  const pace = path({ window: [20, 20], rest: [0.5, 0.5] }, (f) => [500 + 8 * Math.sin(f / 5), 100]);
  assert.equal(new Set(pace.map(([x]) => x)).size, 1, "inside the box: still");
  // it runs right at 3 px a frame: the camera follows with the target on the box's right edge (50 + 10)
  const run = path({ window: [20, 20], rest: [0.5, 0.5] }, (f) => [400 + 3 * f, 100]);
  assert.equal(400 + 3 * 100 - run[100][0], 60);
  assert.equal(run[101][0] - run[100][0], 3, "at its speed");
});

test("look-ahead: running right the picture shows more ahead; once it turns back past `turn` px the camera swings to the other side", () => {
  const T = (f: number) => [f < 60 ? 300 + 2 * f : 420 - 2 * (f - 60), 100];
  const cam = path({ window: [0, 0], ahead: 30, turn: 10, rest: [0.5, 0.5] }, T);
  assert.equal(T(50)[0] - cam[50][0], 50 - 30, "going right: 30 px left of the middle");
  // turned at 60: 4 frames back (8 px) it still looks right, 6 frames back (12 px) it looks left
  assert.equal(T(64)[0] - cam[64][0], 50 - 30);
  assert.equal(T(100)[0] - cam[100][0], 50 + 30, "going left: 30 px right of the middle");
});

test("platform snap: y doesn't move while it jumps, and moves once it lands on another height", () => {
  // walks on y 150, jumps (in the air frames 20-39, 15 px over its way up) onto a ledge at y 130
  const T = (f: number) => (f < 20 ? [300 + f, 150, true] : f < 40 ? [300 + f, 150 - 20 * ((f - 20) / 20) - 15 * Math.sin((Math.PI * (f - 20)) / 20), false] : [300 + f, 130, true]);
  const cam = path({ snap: true, window: [20, 60], rest: [0.5, 0.5] }, T);
  assert.deepEqual(new Set(cam.slice(0, 40).map(([, y]) => y)), new Set([120]), "on the ground and through the jump: 150 - 30");
  assert.equal(cam[41][1], 100, "landed on 130: 130 - 30");
  // with no third value, standing is its y staying put `settle` frames
  const bare = path({ snap: true, window: [20, 60], rest: [0.5, 0.5], settle: 3 }, (f) => T(f).slice(0, 2));
  assert.equal(bare[30][1], 120, "in the air");
  assert.equal(bare[45][1], 100, "standing again");
});

test("clamped to the world's edges, and eased with a speed limit: no step between frames over it, a cut included", () => {
  // the target runs off both ends of the world, then is cut back to the start
  const T = (f: number) => (f < 100 ? [-50 + 12 * f, 400] : [20, 20]);
  const cam = path({ ease: 0.1, speed: 6, window: [10, 10], ahead: 20 }, T, 200);
  for (const [x, y] of cam) assert.ok(x >= 0 && x <= 900 && y >= 0 && y <= 140, `${x},${y} inside the world`);
  assert.deepEqual(cam[0], [0, 140], "starts on the target, clamped");
  let most = 0;
  for (let f = 1; f < cam.length; f++) most = Math.max(most, Math.abs(cam[f][0] - cam[f - 1][0]), Math.abs(cam[f][1] - cam[f - 1][1]));
  assert.equal(most, 6, "at most 6 px a frame");
  assert.ok(cam.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)), "whole px");
  // the defaults scale with the frame: Sonic's 6 px a frame at 60 fps is 18 at 20 fps
  const fast = cameraPath({ world: [1000, 200] }, VIEW, 50, (f) => [f ? 900 : 0, 100]);
  assert.equal(fast(1)[0] - fast(0)[0], 18);
});

// a level 60 px wide through a 20x8 window: a floor of rects, a marker stamped in the world, a backdrop at half
// speed, a HUD pixel; the hero (a 1 px stamp) walks right 2 px a frame
const LEVEL = PAL + `
sprite("dot", { w: 1, h: 1 }, px(0, 0, "r"))
const at = (f) => [2 + 2 * f, 6]
scene("lv", { w: 20, h: 8, bg: "k", frames: 25, fps: 10, camera: { world: [60, 8], follow: FOLLOW, window: [0, 0], ahead: 0, ease: 1 } },
  layer("back", { parallax: 0.5 }, (c) => { for (let x = 0; x < 60; x += 4) c.px(x, 1, "w") }),
  layer("level", rect(0, 7, 60, 1, "g"), rect(30, 4, 3, 3, "w"), stamp("dot", 45, 2, { id: "mark" }), (c) => c.stamp("dot", ...at(c.frame), { id: "hero" })),
  layer("hud", { parallax: 0 }, px(19, 0, "r")))`;
const level = (follow = "at", o = {}) => loadSource(LEVEL.replace("FOLLOW", follow), "t.px.js", o);

test("layers by depth: the world moves with the camera, a backdrop by its parallax, the HUD stays; following an id is following its function", () => {
  const p = level(), q = level('"hero"'), at = (f: number) => p.build("lv", 0, f * 100);
  const [a, b] = [at(10), at(20)], dx = b.camera!.at[0] - a.camera!.at[0];
  assert.equal(dx, 20, "the camera went 20 px");
  assert.deepEqual(b.camera!.shift, { "": [32, 0], back: [16, 0], level: [32, 0], hud: [0, 0] });
  const red = (img: typeof a.img) => img.data.findIndex((c, i) => i < 20 && c === img.data[19]);
  assert.equal(red(a.img), red(b.img), "the HUD's pixel where it was");
  for (const f of [0, 7, 13, 24]) assert.deepEqual(q.build("lv", 0, f * 100).camera!.at, at(f).camera!.at, `frame ${f}`);
  assert.match(failure(PAL + 'scene("s", { w: 4, h: 4 }, layer("l", { parallax: 0.5 }, px(0, 0, "r")))', "s").message, /parallax moves a layer with the scene's camera/);
});

test("what is off the window isn't drawn and changes no pixel: each frame is the whole world cut at the camera; --world draws its box", () => {
  const p = level(), w = level("at", { wholeWorld: true });
  for (const f of [0, 9, 24]) {
    const b = p.build("lv", 0, f * 100), world = w.build("lv", 0, f * 100).img, [cx, cy] = b.camera!.at;
    // the world layer alone: the backdrop and the HUD are drawn at 0, 0 in the whole world
    const lv = b.layers.find((l) => l.name === "level")!.img, wl = w.build("lv", 0, f * 100).layers.find((l) => l.name === "level")!.img;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 20; x++) assert.equal(lv.data[y * 20 + x], wl.data[(cy + y) * 60 + cx + x], `frame ${f} at ${x},${y}`);
    assert.equal(world.w, 60);
    assert.equal(world.data[cy * 60 + cx], 0xff00ffff, "the camera's box");
    assert.ok(!w.build("lv", 0, f * 100).layers.some((l) => l.name === "hud"), "the screen's layers aren't in the world");
  }
  // a rect cut to the image steps from where it starts: at a fraction, the same pixels
  assert.equal(art(PAL + 'sprite("s", { w: 4, h: 1 }, rect(-10.5, 0, 13, 1, "r"))', "s"), "rr..");
});

test("describe and check read the world: where each thing is in it, what is off the picture, the ground and the rules in world coordinates", () => {
  const p = level(), text = (f: number) => describe("lv", p.build("lv", 0, f * 100), p.assets.get("lv")!.pal).text;
  assert.match(text(20), /^CAMERA: the picture shows x 32-51, y 0-7 of a world 60x8/m);
  assert.match(text(20), /hero \(dot\) @level: x 10-10, y 6-6 .*world x 42-42, y 6-6/);
  assert.match(text(0), /^OFF SCREEN \(placed, not on the picture now\): mark \(world x 45-45, y 2-2\)$/m);
  // the hero is on the ground (row 7) and the mark in its box, in the world, wherever the camera is
  const rules = (r: string) => checkProject(loadSource(LEVEL.replace("FOLLOW", "at").replace("frames: 25,", `frames: 25, world: { ground: 7 }, expect: [${r}],`), "t.px.js")).lines;
  assert.deepEqual(rules('{ onGround: ["hero"] }, { inside: ["mark", [44, 1, 3, 3]] }'), []);
  assert.match(rules('{ inside: ["mark", [0, 0, 20, 8]] }').join("\n"), /expect mark inside .*doesn't hold/);
});

test("c.camera: the camera's box in the world, the same on every layer whatever its parallax, the frame's own in --world; --world --every N its boxes on one world", async () => {
  // a layer at half speed and one on the screen each mark the camera's x (2 + x mod 15) on the picture
  const src = LEVEL.replace("FOLLOW", "at").replace(/\)\)\)$/, `)), layer("p5", { parallax: 0.5 }, (c) => c.px(c.view[0] + 2 + c.camera[0] % 15, 2, "g")), layer("p0", { parallax: 0 }, (c) => c.px(c.view[0] + 2 + c.camera[0] % 15, 3, "g")))`);
  const p = loadSource(src, "t.px.js"), w = loadSource(src, "t.px.js", { wholeWorld: true }), green = 0x00e436ff;
  for (const f of [0, 9, 20]) {
    const b = p.build("lv", 0, f * 100), [cx, cy] = b.camera!.at, row = (y: number) => b.img.data.slice(y * 20, y * 20 + 20).indexOf(green);
    assert.deepEqual([row(2), row(3)], [2 + cx % 15, 2 + cx % 15], `frame ${f}: one camera on both`);
    assert.equal(w.build("lv", 0, f * 100).img.data[2 * 60 + 2 + cx % 15], green, `--world, frame ${f}: the frame's own camera, ${cx},${cy}`);
  }
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "lv.px.js");
  writeFileSync(file, LEVEL.replace("FOLLOW", "at"));
  const text = await said("shot", file, "lv", "--world", "--every", "10", "--scale", "1", "--out", dir);
  assert.match(text, /lv_world\.png .*\nboxes \[frame, x, y\]: 0,0,0 10,\d+,0 20,32,0$/);
  const img = decodePng(readFileSync(join(dir, "_shot", "lv_world.png")));
  assert.deepEqual([img.w, img.h, img.get(32, 0), img.get(51, 7)], [60, 8, 0xff00ffff, 0xff00ffff], "the boxes on one world");
});

test("a route followed as it is: its feet, standing unless in the air (the platform snap holds through its jump)", () => {
  const r = route({ px: "side", pace: 2, gravity: 1, rise: 32, walk: "w", air: { jump: "j", apex: "a", fall: "f", land: "l" } }, [[300, 150], [340, 150], { jump: [380, 130] }, [420, 130]]);
  const own = path({ snap: true, window: [20, 80], rest: [0.5, 0.5] }, r as never, 60);
  assert.deepEqual(own, path({ snap: true, window: [20, 80], rest: [0.5, 0.5] }, (f) => { const s = r(f); return s && [s.at[0], s.at[1], !s.air]; }, 60));
  assert.deepEqual([new Set(own.slice(20, 32).map(([, y]) => y)).size, own[19][1] - own[40][1]], [1, 20], "y held in the air, then up the 20 px it landed on");
});
