// Abilities on the scene's clock (vfx.ts): a spell's phases, seeded particles, trails, the energy
// effect, effects on one placement, sockets. Everything a function of the time: any frame alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ability, emitter } from "../src/core/vfx.ts";
import { loadSource } from "../src/node/load.ts";
import { failure } from "./helpers.ts";
import { Img } from "../src/core/image.ts";
import { Canvas } from "../src/core/canvas.ts";

const PALS = 'use("pico8"); pal({ k: 0, r: 8, w: 7, g: 11, y: 10, o: 9, b: 12, d: 1 }); ';
const load = (src: string) => loadSource(PALS + src, "t.px.js");
const same = (a: Img, b: Img) => a.w === b.w && a.data.every((c, i) => c === b.data[i]);

test("ability: phases in time, their starts and events, a point along the way", () => {
  const a = ability([["charge", 400], ["cast", 100], ["travel", 500]], { start: 100, events: { hit: ["travel", 500] } });
  assert.deepEqual([a(50).name, a(50).before, a(300).name, a(300).k, a(550).name, a(700).name, a(2000).done], ["", true, "charge", 0.5, "cast", "travel", true]);
  assert.deepEqual([a.start("cast"), a.start("travel"), a.start("hit"), a.total], [500, 600, 1100, 1000]);
  assert.deepEqual(a.along([0, 0], [100, 0], 850), [50, 0], "halfway through travel");
  assert.deepEqual(a.along([0, 0], [100, 0], 850, { arc: 10 }), [50, -10], "lifted at the middle");
  assert.deepEqual(a.along([0, 0], [100, 0], 200), [0, 0], "before it, where it starts");
  assert.throws(() => a.start("boom"), /no phase or event 'boom'/);
  assert.match(failure(PALS + 'ability({ charge: -1 })').message, /each above 0 ms/);
});

test("emitter: seeded particles, the same at the same time, a burst, a loop that closes, gravity", () => {
  const e = emitter({ rate: 20, life: [500, 500], speed: [10, 10], angle: 0, spread: 0, seed: 2 });
  assert.equal(e(1000).length, 10, "20 a second living half a second");
  assert.deepEqual(e(1234), e(1234));
  const first = e(1000).find((p) => p.id === 11)!;
  assert.ok(Math.abs(first.x - 10 * 0.45) < 1e-9 && first.y === 0, "born at 550, 0.45 s later 4.5 px along");
  const b = emitter({ burst: 5, from: 200, life: [300, 300], speed: [0, 0], gravity: [0, 100] });
  assert.equal(b(100).length, 0, "not yet");
  assert.equal(b(300).length, 5);
  assert.ok(Math.abs(b(400)[0].y - 0.5 * 100 * 0.2 ** 2) < 1e-9, "falling");
  assert.equal(b(600).length, 0, "gone");
  const l = emitter({ rate: 10, life: [300, 900], speed: [5, 30], spread: 180, loop: 2000, seed: 4 });
  assert.deepEqual(l(150).map((p) => [p.x, p.y]), l(2150).map((p) => [p.x, p.y]), "a loop of 2 s closes");
});

test("particles, trails, energy, an effect on one placement, sockets: on the clock, any frame alone", () => {
  const src = `const E = emitter({ at: [8, 8], rate: 30, life: [300, 300], speed: [20, 20], angle: 0, spread: 0, loop: 1000, seed: 1 })
const path = (t) => [2 + t / 50, 8]
sprite("dot", { w: 5, h: 5, pivot: "center", sockets: { tip: [4, 1] } }, circ(2, 2, 2, "r"))
anim("orb", { w: 9, h: 9, frames: 4 }, circ(4, 4, 3, "b"), effect("energy", { keys: "dbwy", scale: 2, speed: 1 }))
scene("s", { w: 40, h: 16, frames: 10, fps: 10 }, particles(E, "yor"), trail(path, "wyo", { length: 200, width: [3, 1], fade: 0 }))
scene("f", { w: 20, h: 10 }, stamp("dot", 5, 5, { fx: ["dissolve", { progress: 1 }] }), stamp("dot", 14, 5, { id: "d", fx: ["dissolve", { progress: 0 }] }), (c) => { const [x, y] = c.socket("d.tip"); c.px(x, y, "y") })`;
  const p = load(src), f = p.frames("s"), pal = p.assets.get("s")!.pal;
  assert.equal(f.length, 10);
  assert.ok(same(load(src).build("s", 0, 500).img, f[5].img), "frame 5 sought alone is frame 5");
  const t5 = f[5].img, head = [Math.round(2 + 500 / 50), 8];
  assert.equal(t5.get(head[0], head[1]), pal.resolve("w"), "the trail's head where the path is now, in its first key");
  assert.equal(t5.get(head[0] - 3, 8), pal.resolve("y"), "behind it, the next key");
  assert.ok(t5.data.some((c) => c === pal.resolve("o") || c === pal.resolve("r")), "particles, aging toward the last keys");
  const orb = p.frames("orb");
  assert.ok(orb[0].img.data.every((c, i) => (c === 0) === (p.image("orb").data[i] === 0)), "energy stays inside its shape");
  assert.ok(orb.some((g) => !same(g.img, orb[0].img)), "and flows on the clock");
  assert.ok(orb[0].img.emit!.some((v) => v > 0), "marked as giving light");
  const fx = p.image("f");
  assert.ok([...Array(10).keys()].every((x) => fx.get(x, 5) === 0 || x >= 10), "progress 1: that copy gone");
  assert.equal(fx.get(14, 5), pal.resolve("r"), "progress 0: as drawn");
  assert.equal(fx.get(14 - 2 + 4, 5 - 2 + 1), pal.resolve("y"), "the socket of the copy named d");
});

test("meshSocket: a socket of a sprite standing in mesh(), in meters", () => {
  const p = load('sprite("t", { w: 4, h: 10, pivot: "bottom", sockets: { hand: [3, 4] } }, rect(0, 0, 4, 10, "r"))');
  const c = new Canvas(new Img(40, 40), p.assets.get("t")!.pal, p);
  // 4 m ahead at a focal of 40 px: 10 px to the meter; the hand 1 px right of the pivot and 6 up
  const h = c.meshSocket({ w: 40, horizon: 10, eye: 1, focal: 40 }, { name: "t", at: [0, 4] }, "hand");
  assert.deepEqual(h.map((v) => Math.round(v * 1000) / 1000), [0.1, 4, 0.6]);
  assert.deepEqual(c.meshSocket({ w: 40, horizon: 10, eye: 1, focal: 40 }, { name: "t", at: [0, 4] }, "hand", 2).map((v) => Math.round(v * 1000) / 1000), [0.2, 4, 1.2], "pixel 2: twice as far");
  assert.throws(() => c.meshSocket({ w: 40, horizon: 10, eye: 1, focal: 40 }, { name: "t", at: [0, 4] }, "foot"), /no socket 'foot'/);
});
