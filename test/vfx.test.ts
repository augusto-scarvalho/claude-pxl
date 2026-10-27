// Abilities on the scene's clock (vfx.ts): a spell's phases, seeded particles, trails, the energy
// effect, effects on one placement, sockets. Everything a function of the time: any frame alone.
import assert from "node:assert/strict";
import { ability, emitter, follow, route, tween, turnToward, unroll } from "../src/core/vfx.ts";
import { loadSource } from "../src/node/load.ts";
import { failure } from "./helpers.ts";
import { Img } from "../src/core/image.ts";
import { Canvas } from "../src/core/canvas.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/vfx.test.ts");

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

test("ability: a pose's frames by phase, a span, a fade and a since", () => {
  const a = ability([["charge", 500], ["cast", 100], ["travel", 200], ["impact", 300]], { start: 100 });
  const steps: [string, number, number?, number?][] = [["charge", 0, 1, 100], ["charge", 2, 4], ["cast", 5], ["travel", 6], ["impact", 7, 9, 100]];
  const f = (t: number) => a.frame(t, steps, { before: 12 });
  // charge 100-600: 0, 1 at 100 ms, then 2-4 over the 300 ms left; cast 5; travel 6; impact 7-9, then 9 held
  assert.deepEqual([50, 100, 250, 300, 399, 400, 500, 599, 650, 700, 900, 1000, 1100, 5000].map(f), [12, 0, 1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 9]);
  assert.deepEqual([0, 150, 400].map((t) => a.frame(t, [["charge", 0, 2, 100]], { before: -1, after: -1 })), [-1, 0, -1], "after its last frame");
  assert.deepEqual([a.span(50, "cast"), a.span(650, "cast"), a.span(800, "travel", ["travel", 400]), a.span(9000, "impact")], [0, 0.5, 0.25, 1]);
  assert.deepEqual([a.fade(700, "travel"), a.fade(750, "travel", undefined, { in: 0.5 }), a.fade(850, "travel", undefined, { out: 0.5 }), a.fade(1000, "travel")], [1, 0.5, 0.5, 0]);
  assert.deepEqual([a.since(700, "travel", 50, 3), a.since(750, "travel", 50, 3), a.since(1000, "travel", 50, 3), a.since(750, ["travel", -100])], [0, 1, 2, 150]);
  assert.throws(() => a.frame(0, [["dash", 0]]), /no phase 'dash'/);
});

test("tween and unroll: keys carried and eased, strings held, moments on their own t; runs a value a frame", () => {
  const at = tween([{ t: 0, x: 0, p: [0, [0, 4]], look: "calm" }, { t: 4, x: 8, hit: 1 }, { t: 5, x: 10, look: "grit" }, { t: 6 }], { moments: ["hit"] });
  assert.deepEqual(at(2), { t: 2, x: 4, p: [0, [0, 4]], look: "calm" }, "halfway, eased; carried arrays");
  assert.equal(at(1).x, 8 * 0.15625, "smoothstep over a span of 4");
  assert.equal(at(4.5).x, 9, "straight over a span of 1");
  assert.deepEqual([at(4).hit, at(4.5).hit, at(5).hit, at(4.5).look, at(5).look], [1, undefined, undefined, "calm", "grit"]);
  assert.deepEqual([at(-1).x, at(9).x, at(9).t, at(6).look], [0, 10, 9, "grit"], "before the first, after the last");
  assert.throws(() => tween([{ t: 2 }, { t: 1 }]), /each t a number past the one before/);
  assert.deepEqual(unroll([[2, "rest"], [0, "x"], [1, "cut", 4]]), ["rest", "rest", ["cut", 4]]);
  assert.match(failure(PALS + 'unroll([[1.5, "a"]])').message, /frames a whole number/);
});

test("follow: a value lagging a loop's, its first frame after its last; a peak falling back", () => {
  // eased halfway a frame: a step up at frame 1 of 4, round the loop twice
  const v = follow([0, 8, 8, 8], { damp: 0.5 });
  assert.deepEqual(v, [3.5, 5.75, 6.875, 7.4375], "its first frame carries the last one's (7 halved)");
  assert.deepEqual(follow([1, 0, 0, 0], { damp: 0.5, peak: true }), [1, 0.5, 0.25, 0.125]);
  assert.match(failure(PALS + "follow([1, 2], { damp: 1 })").message, /damp 0..1/);
});

test("route: legs at a pace and holds by name, the feet on the ground, the way clear, by distance round a corner", () => {
  const v = route({ pace: 0.5, origin: [0, 10], ground: (x, z) => z - 10, walk: "w", idle: { anim: "i", frame: (f, t) => t }, loop: 4 },
    [[0, 0], [2, 0], { hold: 3, name: "talk" }, { to: [2, 2], name: "up" }]);
  // 4 frames east, 3 held facing the way it came, 4 north: 11, a whole number of 4 is 12
  assert.deepEqual([v.total, v.frames, v.start("talk"), v.start("up"), v.step("up").n], [11, 12, 4, 7, 4]);
  assert.deepEqual([v(2), v(5), v(9), v(11)], [{ name: "w_e", at: [1, 10, 0], frame: 2, dir: "e" }, { name: "i_e", at: [2, 10, 0], frame: 1, dir: "e" }, { name: "w_n", at: [2, 11, 1], frame: 9, dir: "n" }, null]);
  assert.deepEqual([v.near([1, 10.5], 1), v.near([1, 12], 1)], [true, false]);
  assert.equal(route({ pace: 0.5, ground: (x, z) => z, climb: true }, [[0, 0], [0, 2]]).total, 6, "the rise counted: 2.83 m");
  assert.equal(route({ pace: (d) => (d === "e" ? 1 : 0.5) }, [[0, 0], [2, 0], [2, 2]]).total, 6, "a pace by the leg's way: 2 frames east, 4 north");
  const p = route({ pace: 1, walk: { anim: "side", flip: true } }, [[0, 0], [2, 0], [0, 0]]);
  assert.deepEqual([p(0)!.name, p(0)!.flip, p(2)!.name, p(2)!.flip], ["side", undefined, "side", "x"], "one side view, flipped going west");
  // a step's own anim as walk's and idle's: a name, or { anim, frame, flip } (once taken for a name: "[object Object]_e")
  const q = route({ pace: 1, walk: "w" }, [[0, 0], { hold: 2, dir: "e", anim: { anim: "sweep", frame: (f, t) => 10 + t } }, { to: [-2, 0], anim: { anim: "side", flip: true } }]);
  assert.deepEqual([q(1)!.name, q(1)!.frame, q(3)!.name, q(3)!.flip], ["sweep_e", 11, "side", "x"]);
  // s m along, the corner a quarter circle of 1 m; straight on before the start and past the end
  const r = route({ round: 1 }, [[0, 10], [0, 0], [10, 0]]), mid = r.at(9 + Math.PI / 4), end = r.at(12 + Math.PI / 2);
  assert.deepEqual(r.at(-1), { x: 0, z: 11, heading: [0, -1] });
  assert.ok([mid.x - (1 - Math.SQRT1_2), mid.z - (1 - Math.SQRT1_2), mid.heading[0] - Math.SQRT1_2, end.x - 4, end.z].every((d) => Math.abs(d) < 1e-9), "halfway round, then on");
  assert.throws(() => v.start("grave"), /no phase or event 'grave'/);
  assert.match(failure(PALS + 'route({ pace: 1 }, [[0, 0], { hold: 1.5 }])').message, /a hold is a whole number of frames/);
  assert.match(failure(PALS + 'route({ pace: 1 }, [[0, 0], [0, 0]])').message, /other than the last/);
  // px: a flat scene's, points on the picture (up it is n), pace px a frame, at whole px to stamp
  const f = route({ px: true, pace: 2, walk: "w" }, [[10, 20], [10, 15], [16, 15]]);
  assert.deepEqual([f.total, f(1), f(4)], [6, { name: "w_n", at: [10, 18], frame: 1, dir: "n" }, { name: "w_e", at: [12, 15], frame: 4, dir: "e" }]);
});

test("turnToward: a step every two frames the shorter way round, toward a point within reach or a direction", () => {
  const t = turnToward("m", [0, 0], (f: number) => (f >= 3 ? "n" : null), { rest: "s", frame: () => 0 });
  assert.deepEqual([0, 3, 4, 6, 8, 10].map((f) => t(f).name), ["m_s", "m_s", "m_sw", "m_w", "m_nw", "m_n"], "on even frames, west round (a tie turns clockwise)");
  assert.deepEqual(turnToward("m", [0, 0], (f: number) => (f >= 3 ? "n" : null), { rest: "s", from: 3 })(9), { name: "m_n", at: [0, 0], frame: 9 }, "counted from frame 3; any frame alone");
  assert.deepEqual([0, 2, 4].map((f) => turnToward("m", [0, 0], [3, 3], { within: 5 })(f).name), ["m_se", "m_e", "m_ne"]);
  assert.equal(turnToward("m", [0, 0], { at: [6, 6] }, { within: 5 })(8).name, "m_s", "out of reach: at rest");
  assert.match(failure(PALS + 'turnToward("m", [0, 0], null, { rest: "up" })').message, /rest is one of n, ne/);
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

test("c.moved and c.cross: whole px a frame on the clock, wrapped into a strip, the loop closing", () => {
  const p = load('sprite("t", "r")'), c = new Canvas(new Img(4, 4), p.assets.get("t")!.pal, p);
  c.frames = 8;
  const at = (f: number, fn: () => number) => { c.frame = f; return fn(); };
  assert.deepEqual([0, 1, 3, 7].map((f) => at(f, () => c.moved(12))), [0, 1, 4, 10], "12 px over 8 frames, floored");
  assert.deepEqual([0, 2, 4, 7].map((f) => at(f, () => c.cross(2, { span: 10, per: -20, from: -3 }))), [-1, 4, -1, 1], "leftward twice round a strip from -3");
  assert.deepEqual([1, 5].map((f) => at(f, () => c.cross(0, { span: 12, whole: false }))), [1.5, 7.5], "1.5 px a frame, not floored");
  assert.throws(() => c.cross(0, { span: 10, per: 15 }), /a whole number of spans/);
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

test("trail of a blade: the band its edge swept, tail to head in the keys' shares, tapered, on one side", () => {
  // the tip along row 4, 1 px a ms, the inner point 4 px under it, a third number (its depth) coming along
  const at = (o: string) => load(`scene("s", { w: 30, h: 12 }, trail((t, i) => [[t, 4, t], [t, 8, i]], "wr", { t: 24, length: 20, step: 5${o} }))`);
  const img = (o = "") => at(o).image("s"), p = at(""), r = p.assets.get("s")!.pal.resolve("r"), w = p.assets.get("s")!.pal.resolve("w");
  const plain = img();
  assert.deepEqual([6, 12, 16, 22].map((x) => plain.get(x, 5)), [r, r, w, w], "the tail half in its last key, the head in its first");
  assert.ok([2, 25].every((x) => plain.get(x, 5) === 0) && plain.get(10, 8) === 0 && plain.get(10, 7) === r, "from where it was 20 ms ago to now, tip to inner point");
  assert.ok(img(", taper: true").get(5, 7) === 0 && img(", taper: true").get(22, 7) === w, "taper: nothing across at its tail, all of it at its head");
  assert.deepEqual([6, 16].map((x) => img(", side: (q) => q[2] > 12").get(x, 5)), [0, w], "side: the stretches whose tip passes");
});
