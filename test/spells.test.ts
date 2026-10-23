// The spell kit (spells.ts): spell(element, tier, { from, to }) a whole cast on the clock, an element a
// recipe, a tier scaling it; cast() drawing it, what it draws giving light, its lamps, flash and shake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ELEMENTS, TIERS, type ViewOpt, spell, spellView } from "../src/core/spells.ts";
import { loadSource } from "../src/node/load.ts";
import { failure } from "./helpers.ts";

const PALS = 'use("pico8"); pal({ k: 0, g: 3, w: 7 }); ';
const load = (src: string) => loadSource(PALS + src, "t.px.js");
const same = (a: { data: Uint32Array }, b: { data: Uint32Array }) => a.data.every((c, i) => c === b.data[i]);

test("spell: phases scaled by the tier, where it is, its lamps, flash and shake", () => {
  const at = { from: [10, 30], to: [90, 30], start: 100 };
  const [s1, s2, s3] = [1, 2, 3].map((t) => spell("fire", t, at));
  assert.ok(s1.total < s2.total && s2.total < s3.total, "a higher tier lasts longer");
  assert.equal(s1.ability.start("charge"), 100);
  const hit = s3.ability.start("impact");
  const seen = (t: number) => s3.view.P(s3.at(t));
  assert.deepEqual(seen(50), [10, 30], "before it flies, at the hand (on the picture, as given)");
  assert.deepEqual(seen(hit + 10), [90, 30], "after, where it hit");
  assert.ok(seen((s3.ability.start("travel") + hit) / 2)[1] < 30, "an arc on its way (fire's arc)");
  assert.equal(spell("lightning", 3, at).ability.start("impact") - spell("lightning", 3, at).ability.start("travel"), 160, "a bolt's flight isn't drawn out");
  const lamp = (s: typeof s1) => s.lights(s.ability.start("impact") + 1)[0];
  assert.ok(lamp(s1).r < lamp(s3).r && lamp(s1).power < lamp(s3).power, "its light reaches further and is stronger");
  assert.ok(s1.glow < s3.glow, "and what it draws gives more");
  assert.deepEqual(s1.lights(50), [], "nothing before it starts");
  assert.equal(s1.flash(s1.ability.start("impact") + 10), undefined, "tier 1 doesn't flash");
  assert.equal(s3.flash(hit + 10)?.color, ELEMENTS.fire.keys[0], "tier 3 flashes its core");
  assert.equal(spell("dark", 3, at).flash(spell("dark", 3, at).ability.start("impact"))?.color, "#000000", "dark flashes black");
  assert.deepEqual(s1.shake(s1.ability.start("impact") + 10), [0, 0]);
  assert.ok([0, 50, 100, 150].some((d) => s3.shake(hit + d).some((v) => v !== 0)), "tier 3 shakes the picture as it hits");
  assert.deepEqual(s3.shake(hit + 400), [0, 0], "and settles");
  assert.equal(TIERS.length, 3);
});

test("spell: an element of one's own, like another with its own over it; what's wrong said", () => {
  const green = spell({ like: "fire", keys: ["#efe", "#8f8", "#3a3", "#131"], big: "helix" }, 3, { from: [0, 0], to: [50, 0] });
  assert.equal(green.element.keys[1], "#8f8");
  assert.equal(green.element.impact?.shape, "burst", "the rest from fire");
  assert.equal(spell("ice", 2, { from: [0, 0], to: [50, 0], keys: ["#fff", "#aaf", "#55a", "#225"] }).element.big, "spikes", "a key given over a named one");
  assert.throws(() => spell("plasma", 1, { from: [0, 0], to: [1, 0] }), /no element 'plasma'; there are fire, ice/);
  assert.throws(() => spell("fire", 4, { from: [0, 0], to: [1, 0] }), /the tier is 1, 2 or 3/);
  assert.throws(() => spell({ keys: ["#fff", "#f00"], colour: 1 } as never, 1, { from: [0, 0], to: [1, 0] }), /has no 'colour'/);
  assert.throws(() => spell({ keys: ["#fff", "#f00"], big: "volcano" } as never, 1, { from: [0, 0], to: [1, 0] }), /big is pillar, bolts/);
  assert.match(failure(PALS + 'spell("fire", 1, { from: [0, 0], to: [9, 0], tiers: 2 })').message, /unknown option 'tiers'/);
  assert.match(failure(PALS + 'scene("s", { w: 9, h: 9 }, cast({}))', "s").message, /cast\(spell/);
});

test("cast: every element at every tier draws on the clock, any frame alone; what it draws gives light", () => {
  const cells = Object.keys(ELEMENTS).flatMap((el) => [1, 2, 3].map((t) =>
    `anim("${el}_${t}", { w: 96, h: 64, frames: 40, fps: 20 }, rect(0, 50, 96, 14, "g"), cast(spell("${el}", ${t}, { from: [12, 40], to: [76, 40], ground: 52, start: 100 })))`)).join("\n");
  const p = load(cells);
  // (only the frames looked at are drawn: frame k at k * 50 ms)
  for (const el of Object.keys(ELEMENTS))
    for (const t of [1, 2, 3]) {
      const at = (k: number) => p.image(`${el}_${t}`, 0, k * 50), f0 = at(0);
      assert.ok(same(at(1), f0), `${el} ${t}: nothing before it starts`);
      for (const k of [6, 18, 32]) assert.ok(!same(at(k), f0), `${el} ${t}: drawn at frame ${k}`);
    }
  const f = p.frames("fire_3");
  assert.ok(same(load(cells).build("fire_3", 0, 1600).img, f[32].img), "frame 32 sought alone is frame 32");
  const e = f[6].img.emit!;
  assert.ok(e.some((v) => v === 255) && f[6].img.data.every((c, i) => c === f[0].img.data[i] || e[i] > 0), "the spell's pixels give light (tier 3: all of it)");
  assert.equal(e[60 * 96 + 2], 0, "the ground doesn't");
  const lit = load(`anim("a", { w: 96, h: 64, frames: 40, fps: 20 }, rect(0, 0, 96, 64, "g"), cast(spell("fire", 3, { from: [12, 40], to: [76, 40], ground: 52 })), lighting({ ambient: 0.3 }))`);
  const luma = (k: number) => { const c = lit.image("a", 0, k * 50).get(40, 30); return (c >>> 24) + ((c >>> 16) & 255) + ((c >>> 8) & 255); };
  assert.ok(luma(32) > luma(0) + 30, "its lamps light the ground near it as it hits");
});

test("spell: variants and their form, one at every tier; views of one world", () => {
  const w = { from: [-30, 0, 10], to: [30, 0, 10], start: 0 };
  const berg = (tier: number, form = {}) => spell("ice", tier, { ...w, variant: "iceberg", form });
  assert.ok(berg(1).total < berg(3).total, "a named variant at every tier, as long as the tier");
  assert.ok(berg(3, { stay: 2000 }).total - berg(3).total === 1100, "form.stay: how long it stays");
  assert.throws(() => spell("ice", 3, { ...w, variant: "igloo" }), /no variant 'igloo'; this element's are spikes, iceberg, glacier, blizzard, nova/);
  assert.throws(() => spell("ice", 3, { ...w, variant: "iceberg", form: { sides: 3 } as never }), /form takes size, count, facets, jag, debris and stay, not 'sides'/);
  assert.throws(() => spell("ice", 3, { ...w, view: "fisheye" as never }), /view is "side", "top", "iso"/);
  // a falling boulder starts high over where it lands and comes down there
  const b = spell("earth", 3, { ...w, variant: "boulder" }), t0 = b.ability.start("travel"), hit = b.ability.start("impact");
  assert.ok(b.at(t0 + 1)[2] > 100 && b.at(hit)[2] < 30 && Math.abs(b.at(hit)[0] - 30) < 1e-9, "from the sky to the ground at the target");
  // the same world point seen four ways
  const p = [10, 20, 30];
  assert.deepEqual(spellView({ kind: "side", origin: [0, 50] }, p).P(p), [10, 50 + 7 - 30], "side: y squashed to 0.35, z up");
  assert.deepEqual(spellView({ kind: "iso", origin: [0, 50] }, p).P(p), [10 - 20, 50 + 15 - 30], "iso 2:1");
  const top = spellView({ kind: "top", origin: [0, 0], height: 240 }, p);
  assert.deepEqual(top.P(p), [10, 20], "top: where it is on the ground");
  assert.ok(top.s([0, 0, 120]) < top.s([0, 0, 0]), "a height foreshortened: smaller up there");
  const cam = spellView({ w: 100, horizon: -20, eye: 3, fov: 40, pitch: -30 }, [0, 6, 0]);
  assert.ok(Math.abs(cam.s([0, 6, 0]) * cam.unit - 1) < 1e-9 && cam.s([0, 9, 0]) < cam.s([0, 6, 0]), "a perspective camera: px of the spell where it lands, smaller further off");
});

test("spell: from the caster's hand, a socket or a point on the picture, in every view", () => {
  // a point on the picture lifts to the hand's height (from the side, as deep as the target)
  const views: [string, ViewOpt, number[]][] = [["side", { kind: "side", origin: [0, 60] }, [30, 0, 8]], ["top", { kind: "top", origin: [48, 32] }, [30, 0, 8]],
    ["iso", { kind: "iso", origin: [48, 40] }, [30, 0, 8]], ["perspective", { w: 96, horizon: -40, eye: 3, fov: 40, pitch: -30 }, [1, 6, 0.4]]];
  for (const [name, view, to] of views) {
    const s = spell("fire", 3, { view, from: { at: [20, 30] }, to }), q = s.view.P(s.at(0));
    assert.ok(Math.abs(q[0] - 20) < 0.01 && Math.abs(q[1] - 30) < 0.01, `${name}: it starts where the hand is on the picture`);
    if (name === "top" || name === "iso") assert.ok(Math.abs(s.at(0)[2] - 22) < 1e-6, "up at the hand's height (22 px)");
  }
  assert.ok(spell("fire", 1, { view: "iso", from: [0, 0], to: [30, 0], hand: 10 }).at(0)[2] === 10, "[x, y] stands there, its hand `hand` up");
  // a socket, read where it is drawn: the energy gathers at it in each frame
  const p = load(`sprite("guy", { w: 8, h: 16, pivot: [4, 16], sockets: { hand: [7, 6] } }, rect(0, 0, 8, 16, "w"))
anim("a", { w: 96, h: 48, frames: 20, fps: 20 }, stamp("guy", 10, 40, { id: "hero" }), cast(spell("fire", 3, { from: "hero.hand", to: [70, 30], ground: 40, start: 0 })))`);
  const f = p.frames("a")[8].img, pal = p.assets.get("a")!.pal, hand = [10 - 4 + 7, 40 - 16 + 6];
  assert.ok([-1, 0, 1].some((d) => { const c = f.get(hand[0] + d, hand[1]); return c !== 0 && c !== pal.resolve("w"); }), "the charge at the hand");
  assert.match(failure(PALS + 'anim("a", { w: 9, h: 9, frames: 2 }, cast(spell("fire", 1, { from: "nobody.hand", to: [5, 5] })))', "a").message, /nothing placed as 'nobody'/);
});

test("cast: the variants draw on the clock in every view", () => {
  const views = { side: '{ kind: "side", origin: [0, 60] }', top: '{ kind: "top", origin: [48, 32] }', iso: '{ kind: "iso", origin: [48, 40] }' };
  const cells = Object.entries(views).flatMap(([vn, v]) => ["iceberg", "glacier", "nova", "blizzard"].map((variant) => ["ice", variant, vn, v])
    .concat(["spire", "boulder", "quake", "slide"].map((variant) => ["earth", variant, vn, v])))
    .map(([el, variant, vn, v]) => `anim("${variant}_${vn}", { w: 96, h: 64, frames: 50, fps: 20 }, rect(0, 0, 96, 64, "g"), cast(spell("${el}", 3, { view: ${v}, from: [-30, 0, 10], to: [30, 0, 8], variant: "${variant}", start: 100, seed: 3 })))`).join("\n");
  const p = load(cells);
  // (any frame alone: only those looked at are drawn)
  for (const n of p.order) {
    const f0 = p.image(n, 0, 0), drawn = (k: number) => !same(p.image(n, 0, k * 50), f0);
    assert.ok([30, 40, 48].some(drawn), `${n}: something there after it lands`);
  }
});

test("cast in mesh()'s depth: a wall nearer the eye hides it, its lamps light the diorama; shake for a whole scene", () => {
  // the camera of the views test; a wall 2 m high between the caster and the target behind it
  const V = "{ w: 96, horizon: -40, eye: 3, fov: 40, pitch: -30 }", S = `spell("fire", 3, { view: ${V}, from: [-1, 6, 1], to: [1.5, 6, 0.4], start: 0, seed: 2 })`;
  const stage = (wall: boolean, cast: string, lamps = "") => load(`sprite("_w", "w")
const M = model(); M.face("f", [-9, 1, 0], [9, 1, 0], [9, 30, 0], [-9, 30, 0])${wall ? '; M.box("f", [0.4, 4.4, 0], [3, 4.6, 2])' : ""}
const SP = ${S}
anim("a", { w: 96, h: 64, frames: 40, fps: 20 }, (c) => c.mesh(${V}, M.faces, { f: { tex: "_w" } }, { light: [-0.5, -0.5, 0.7], sun: "w"${lamps} }), ${cast})`);
  const s = spell("fire", 3, { view: { w: 96, horizon: -40, eye: 3, fov: 40, pitch: -30 }, from: [-1, 6, 1], to: [1.5, 6, 0.4], start: 0, seed: 2 }), t = s.ability.start("impact") + 120;
  const z = s.depth(t)!, img = (wall: boolean, cast: string, lamps?: string) => stage(wall, cast, lamps).image("a", 0, t);
  assert.ok(z > 0 && spell("fire", 3, { from: [10, 30], to: [90, 30] }).depth(t) === undefined, "a depth through a camera only");
  const bare = img(true, "rect(0, 0, 1, 1, \"w\")"), cast = img(true, "cast(SP, { shake: false })"), D = cast.depth!;
  let hidden = 0, shown = 0;
  for (let i = 0; i < D.length; i++) if (cast.data[i] !== bare.data[i]) { if (D[i] < z) hidden++; else shown++; }
  assert.equal(hidden, 0, "nothing drawn where the wall stands nearer the eye");
  assert.ok(shown > 0, "drawn over what is behind it");
  const open = img(false, "cast(SP, { shake: false })"), openBare = img(false, "rect(0, 0, 1, 1, \"w\")");
  assert.ok([...D.keys()].some((i) => D[i] < z && open.data[i] !== openBare.data[i]), "without the wall it is drawn there");
  // its lamps in meters, for mesh()'s lamps: the floor round where it hit lit in its color
  const L = s.lamps(t);
  assert.equal(L.length, 1);
  assert.ok(Math.abs(L[0].at[0] - 1.5) < 0.01 && Math.abs(L[0].at[1] - 6) < 0.01 && L[0].r > 0.3 && L[0].strength === s.lights(t)[0].power, JSON.stringify(L[0]));
  assert.ok(!same(img(false, "rect(0, 0, 1, 1, \"w\")", ", lamps: SP.lamps(c.t)"), openBare), "the diorama lit by it");
  // shake: none in the cell with shake: false, the whole scene thrown by shake(spell)
  const hit = load(`anim("cell", { w: 40, h: 30, frames: 20, fps: 20 }, rect(0, 0, 40, 30, "g"), rect(10, 10, 4, 4, "w"), cast(spell("earth", 3, { from: [5, 20], to: [30, 20], start: 0 }), { shake: false }))
const SP = spell("earth", 3, { from: [5, 20], to: [30, 20], start: 0 })
scene("s", { w: 90, h: 30, bg: "k" }, stamp("cell", 0, 0), rect(50, 10, 4, 4, "w"), shake(SP))`);
  const sp = spell("earth", 3, { from: [5, 20], to: [30, 20], start: 0 }), tt = [0, 50, 100, 150].map((d) => sp.ability.start("impact") + d).find((x) => sp.shake(x).some((v) => v))!, [dx, dy] = sp.shake(tt);
  const frame = hit.image("s", 0, tt), cell = hit.image("cell", 0, tt);
  assert.equal(cell.get(11, 11), hit.image("cell", 0, 0).get(11, 11), "the cell itself still");
  assert.equal(frame.get(51 + dx, 11 + dy), cell.get(11, 11), "the scene thrown: the square beside the cell moved with it");
  assert.match(failure(PALS + 'anim("a", { w: 9, h: 9, frames: 2 }, cast(spell("fire", 1, { from: [1, 1], to: [5, 5] }), { shook: false }))', "a").message, /no option 'shook'/);
});
