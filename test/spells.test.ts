// The spell kit (spells.ts): spell(element, tier, { from, to }) a whole cast on the clock, an element a
// recipe, a tier scaling it; cast() drawing it, what it draws giving light, its lamps, flash and shake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ELEMENTS, TIERS, spell } from "../src/core/spells.ts";
import { loadSource } from "../src/node/load.ts";
import { failure } from "./helpers.ts";

const PALS = 'use("pico8"); pal({ k: 0, g: 3, w: 7 }); ';
const load = (src: string) => loadSource(PALS + src, "t.px.js");
const same = (a: { data: Uint32Array }, b: { data: Uint32Array }) => a.data.every((c, i) => c === b.data[i]);

test("spell: phases scaled by the tier, where it is, its lamps, flash and shake", () => {
  const at = { from: [10, 30] as [number, number], to: [90, 30] as [number, number], start: 100 };
  const [s1, s2, s3] = [1, 2, 3].map((t) => spell("fire", t, at));
  assert.ok(s1.total < s2.total && s2.total < s3.total, "a higher tier lasts longer");
  assert.equal(s1.ability.start("charge"), 100);
  const hit = s3.ability.start("impact");
  assert.deepEqual(s3.at(50), [10, 30], "before it flies, at the hand");
  assert.deepEqual(s3.at(hit + 10), [90, 30], "after, where it hit");
  assert.ok(s3.at((s3.ability.start("travel") + hit) / 2)[1] < 30, "an arc on its way (fire's arc)");
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
  for (const el of Object.keys(ELEMENTS))
    for (const t of [1, 2, 3]) {
      const f = p.frames(`${el}_${t}`);
      assert.ok(f[1].img.data.every((c, i) => c === f[0].img.data[i]), `${el} ${t}: nothing before it starts`);
      for (const k of [6, 18, 32]) assert.ok(!same(f[k].img, f[0].img), `${el} ${t}: drawn at frame ${k}`);
    }
  const f = p.frames("fire_3");
  assert.ok(same(load(cells).build("fire_3", 0, 1600).img, f[32].img), "frame 32 sought alone is frame 32");
  const e = f[6].img.emit!;
  assert.ok(e.some((v) => v === 255) && f[6].img.data.every((c, i) => c === f[0].img.data[i] || e[i] > 0), "the spell's pixels give light (tier 3: all of it)");
  assert.equal(e[60 * 96 + 2], 0, "the ground doesn't");
  const lit = load(`anim("a", { w: 96, h: 64, frames: 40, fps: 20 }, rect(0, 0, 96, 64, "g"), cast(spell("fire", 3, { from: [12, 40], to: [76, 40], ground: 52 })), lighting({ ambient: 0.3 }))`).frames("a");
  const luma = (k: number) => { const c = lit[k].img.get(40, 30); return (c >>> 24) + ((c >>> 16) & 255) + ((c >>> 8) & 255); };
  assert.ok(luma(32) > luma(0) + 30, "its lamps light the ground near it as it hits");
});
