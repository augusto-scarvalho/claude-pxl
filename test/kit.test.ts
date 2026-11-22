// Character kit features: modular fantasy race parts, digitigrade legs, status/evade moves,
// universal sockets, emission maps, kit.swap(), and generic engine-agnostic kit.export().
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { loadProject } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import type { Project } from "../src/core/project.ts";
import { root, whenChanged } from "./passed.ts";

const test = whenChanged("test/kit.test.ts", [
  "lib/characters/kit.px.js",
  "lib/characters/crew.px.js",
  "lib/characters/traveler.px.js",
  "lib/characters/dress.px.js",
  "lib/profiles/hd2d.px.js",
]);

const KIT = join(root, "lib", "characters", "kit.px.js").split(sep).join("/");
const INC = `include("${KIT}", { as: "kit", palette: true })\n`;
const loadArt = (src: string, name: string): Project => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-kit-src-")), file = join(dir, name);
  try { writeFileSync(file, src); return loadProject(file); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const built = (p: Project, only: string[], f: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-kit-"));
  try { writeOutputs(p, dir, { only, preview: false }); f(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const json = (dir: string, n: string) => JSON.parse(readFileSync(join(dir, n + ".json"), "utf8"));
const hasEmit = (e: Uint8Array | undefined) => !!e && e.some((v) => v > 0);

test("kit race parts, rules, digitigrade legs, interior line mode, and visor/gem emission", () => {
  const p = loadArt(INC + `
    const errCrown = kit.check({ ears: "cat", headwear: "helmet" })
    const okCrown = kit.check({ ears: "cat", headwear: "circlet" })
    const errHorns = kit.check({ horns: "bull", headwear: "greathelm" })
    const okHorns = kit.check({ horns: "bull", headwear: "bandana" })
    const okSkullHood = kit.check({ head: "skull", headwear: "hooddown" })
    const okSkullHelm = kit.check({ head: "skull", headwear: "helmet" })
    const okJackalope = kit.check({ head: "rabbit", horns: "antlers", tail: "rabbit", digi: true })
    const okReptileFurs = kit.check({ head: "reptile", shoulders: "furs" })
    const okMinotaur = kit.check({ body: "large", head: "bull", digi: true, mane: "bull", tail: "bull", torso: "harness", legs: "breeches", feet: "hooves", belt: "belt" })
    const okWerewolf = kit.check({ body: "large", head: "werewolf", digi: true, tail: "wolf", mane: "wolf", hands: "wolf", torso: "harness", legs: "rolled", feet: "paws", belt: "belt" })
    const errHoofGreaves = kit.check({ feet: "hooves", shins: "greaves" })
    const errPawGreaves = kit.check({ feet: "paws", shins: "greaves" })
    if (!errCrown || okCrown || !errHorns || okHorns || okSkullHood || okSkullHelm || okJackalope || okReptileFurs || okMinotaur || okWerewolf || !errHoofGreaves || !errPawGreaves) {
      throw new Error("rule check mismatch: " + JSON.stringify({ errCrown, okCrown, errHorns, okHorns, okSkullHood, okSkullHelm, okJackalope, okReptileFurs, okMinotaur, okWerewolf, errHoofGreaves, errPawGreaves }))
    }
    kit.character("elf", { ears: "pointed", hair: "loose", outfit: "ranger", dirs: ["sw"] })
    kit.character("catkin", { ears: "cat", tail: "cat", digi: true, outfit: "rogue", colors: { hair: "ginger", skin: "fair" }, dirs: ["sw"] })
    kit.character("harekin", { ears: "rabbit", tail: "rabbit", digi: true, hair: "bob", torso: "tunic", legs: "breeches", feet: "boots", colors: { hair: "white", torso: "teal" }, dirs: ["sw"] })
    kit.character("goblin", { body: "short", ears: "goblin", hair: "spiky", torso: "smock", legs: "rolled", feet: "bare", colors: { skin: "olive", hair: "dark" }, dirs: ["sw"] })
    kit.character("tiefling", { ears: "pointed", horns: "curved", back: "batwings", tail: "devil", outfit: "mage", colors: { skin: "crimson", horns: "gold", wings: "violet" }, dirs: ["sw"] })
    kit.character("jackalope", { head: "rabbit", horns: "antlers", tail: "rabbit", digi: true, outfit: "ranger", colors: { fur: "cream", horns: "bone" }, dirs: ["sw"] })
    kit.character("lizard", { head: "reptile", digi: true, tail: "reptile", outfit: "barbarian", colors: { scales: "emerald" }, dirs: ["sw"] })
    kit.character("frog_cleric", { body: "short", head: "frog", outfit: "cleric", off: "roundshield", colors: { scales: "frog" }, dirs: ["sw"] })
    kit.character("minotaur", { body: "large", head: "bull", digi: true, mane: "bull", tail: "bull", torso: "harness", legs: "breeches", feet: "hooves", belt: "belt", held: "axe", colors: { fur: "brown", horns: "ivory", torso: "black", feet: "black" }, dirs: ["sw"] })
    kit.character("werewolf", { body: "large", head: "werewolf", digi: true, tail: "wolf", mane: "wolf", hands: "wolf", outfit: "bare", torso: "harness", legs: "rolled", feet: "paws", belt: "belt", held: "axe", colors: { fur: "grey", torso: "black", feet: "black" }, dirs: ["sw"] })
    kit.character("wolf_helm", { body: "beast", digi: true, headwear: "helmet", outfit: "manatarms", feet: "paws", dirs: ["sw"] })
    kit.character("satyr", { horns: "ram", digi: true, torso: "harness", legs: "rolled", feet: "hooves", belt: "belt", dirs: ["sw"] })
    kit.character("skel_pure", { head: "skull", outfit: "bare", held: "sword", off: "roundshield", dirs: ["sw"] })
    kit.character("skel_helm", { head: "skull", face: "skullglow", headwear: "helmet", outfit: "bare", torso: "harness", over: "breastplate2", shoulders: "pauldrons2", belt: "belt", feet: "boots", colors: { eyes: "amber" }, dirs: ["sw"] })
    kit.character("bot", { head: "automaton", outfit: "knight", colors: { chassis: "gilt", visor: "ember" }, dirs: ["sw"] })
    kit.character("mage", { outfit: "mage", held: "magestaff", dirs: ["sw"] })
    kit.character("inked", { outfit: "knight", line: "ink", dirs: ["sw"] })
    kit.character("darked", { outfit: "knight", line: "dark", dirs: ["sw"] })
  `, "kit-races.px.js");

  for (const name of ["elf", "catkin", "harekin", "goblin", "tiefling", "jackalope", "lizard", "frog_cleric", "minotaur", "werewolf", "wolf_helm", "satyr", "skel_pure", "skel_helm", "bot", "mage", "inked", "darked"]) {
    const img = p.image(`${name}_stand_sw`);
    assert.ok(img.w > 0 && img.h > 0 && img.bounds() !== null, `${name} should render non-empty pixels`);
  }
  assert.ok(hasEmit(p.image("bot_stand_sw").emit), "automaton visor should emit light into _e.png");
  assert.ok(hasEmit(p.image("mage_stand_sw").emit), "magestaff gem should emit light into _e.png");
  assert.ok(!hasEmit(p.image("elf_stand_sw").emit), "plain ranger should not emit light");
  // line: "dark" vs line: "ink" should produce distinct interior line pixels
  const a = p.image("darked_stand_sw").data, b = p.image("inked_stand_sw").data;
  assert.equal(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  assert.ok(diff > 10, `expected dark vs ink line modes to differ visibly, got ${diff} differing pixels`);
});

test("kit universal sockets, dodge/downed/dead moves, block guard spark emission, and combat data flags", () => {
  const p = loadArt(INC + `
    kit.character("hero", {
      outfit: "knight", held: "sword", off: "roundshield",
      dirs: ["sw"], moves: ["stand", "walk", "slash", "block", "dodge", "downed", "dead"],
    })
  `, "kit-moves.px.js");

  // universal sockets on stand and walk
  for (const m of ["stand", "walk"]) {
    const frames = p.frames(`hero_${m}_sw`);
    assert.ok(frames.length >= 1);
    for (const f of frames) {
      for (const sock of ["head_top", "center", "main", "off"]) {
        assert.ok(f.img.sockets?.[sock], `expected socket '${sock}' on ${m}`);
      }
    }
  }
  // dodge (4 frames, evade flag)
  const dodge = p.frames("hero_dodge_sw");
  assert.equal(dodge.length, 4);
  assert.equal(dodge[1].img.info?.evade, true);
  // downed (4 frames, downed flag)
  const downed = p.frames("hero_downed_sw");
  assert.equal(downed.length, 4);
  assert.equal(downed[0].img.info?.downed, true);
  // dead (1 frame, dead flag)
  const dead = p.frames("hero_dead_sw");
  assert.equal(dead.length, 1);
  assert.equal(dead[0].img.info?.dead, true);
  // block (7 frames, blockImpact + guard spark emission on frame 2)
  const block = p.frames("hero_block_sw");
  assert.equal(block.length, 7);
  assert.equal(block[2].img.info?.blockImpact, true);
  assert.ok(hasEmit(block[2].img.emit), "block recoil frame 2 should emit metallic guard spark");
  // slash (strike flag + hit socket)
  const slash = p.frames("hero_slash_sw");
  assert.ok(slash.some((f) => f.img.info?.strike === true && f.img.sockets?.hit), "slash should mark strike frame and hit socket");
});

test("kit.swap() and kit.export() across atlas, per-dir and strips layouts with aliases, scale and slots", () => {
  const p = loadArt(INC + `
    const SPEC = { outfit: "knight", held: "sword", off: "roundshield", colors: { apron: "green", face: "red" } }
    const ALT = kit.swap(SPEC, { apron: "red", face: "navy" })
    kit.export("atlas_hero", SPEC, {
      layout: "atlas", dirs: ["sw"], moves: ["idle", "slash"],
      format: "grid", pad: 1, extrude: 1, scale: 2,
      aliases: { moves: { slash: "attack" }, dirs: { sw: "down_left" }, sockets: { head_top: "ui_top" } },
      slots: { alt: ALT },
      meta: { role: "vanguard" },
    })
    kit.export("dir_hero", SPEC, {
      layout: "per-dir", dirs: ["sw"], moves: ["stand"], format: "array",
      aliases: { dirs: { sw: "dl" } },
    })
    kit.export("strip_hero", SPEC, {
      layout: "strips", dirs: ["sw"], moves: ["stand"], format: "hash",
    })
  `, "kit-export.px.js");

  built(p, ["atlas_hero", "dir_hero_dl", "strip_hero_stand_sw"], (dir) => {
    // atlas (grid, scale 2, slots, aliases)
    const a = json(dir, "atlas_hero");
    assert.equal(a.format, "grid");
    assert.equal(a.meta.layout, "atlas");
    assert.equal(a.meta.role, "vanguard");
    assert.equal(a.scale, 2);
    assert.equal(a.pad, 2);
    assert.equal(a.extrude, 2);
    assert.deepEqual(a.meta.dirs, ["down_left"]);
    assert.equal(a.meta.moves.idle.loop, true);
    assert.equal(a.meta.moves.attack.source, "slash");
    assert.equal(a.meta.moves.attack.loop, false);
    assert.ok(a.meta.sockets.includes("ui_top"));
    const atk0 = a.frames.find((f: { name: string }) => f.name === "attack_down_left_0");
    assert.ok(atk0?.sockets?.ui_top, "renamed socket ui_top present in frame JSON");
    assert.ok(a.meta.slots?.alt, "palette slot present in JSON");
    assert.notDeepEqual(a.meta.slots.alt, a.meta.palette, "kit.swap() should remap rendered apron/shield colors");
    assert.ok(existsSync(join(dir, "atlas_hero.alt.hex")));
    assert.ok(existsSync(join(dir, "atlas_hero_n.png")));
    assert.equal(a.normalMap, "atlas_hero_n.png");

    // per-dir (array format)
    const d = json(dir, "dir_hero_dl");
    assert.ok(Array.isArray(d.frames));
    assert.equal(d.meta.layout, "per-dir");
    assert.equal(d.meta.dir, "dl");
    assert.equal(d.frames[0].filename, "stand_0");

    // strips (hash format)
    const s = json(dir, "strip_hero_stand_sw");
    assert.equal(s.meta.layout, "strips");
    assert.equal(s.meta.move, "stand");
    assert.equal(s.meta.dir, "sw");
    assert.ok(s.frames.stand_0);
  });

  // validation errors
  assert.throws(() => loadArt(INC + `kit.export("x", {}, { nope: 1 })`, "e.px.js"), /unknown option 'nope'/);
  assert.throws(() => loadArt(INC + `kit.export("x", {}, { layout: "sheet" })`, "e.px.js"), /layout must be "atlas", "per-dir" or "strips"/);
  assert.throws(() => loadArt(INC + `kit.export("x", {}, { dirs: "16" })`, "e.px.js"), /unknown dirs preset '16'/);
  assert.throws(() => loadArt(INC + `kit.export("x", {}, { moves: "dance" })`, "e.px.js"), /moves must be "basic", "combat", "all"/);
});

test("tall body coat shoulders, jerkin back arms, and dark inner-line silhouettes stay intact", () => {
  const p = loadArt(INC + `
    kit.character("tall_coat", { body: "tall", torso: "shirt", over: "coat", legs: "trousers", feet: "boots", dirs: ["s", "nw", "n"] })
    kit.character("rogue_cat", { ears: "cat", tail: "cat", outfit: "rogue", dirs: ["s", "n"] })
  `, "kit-tall-coat.px.js");
  // tall coat keeps full sleeves in S and N (not amputated by dark inner-line clean pass)
  for (const dir of ["s", "n"]) {
    const img = p.image(`tall_coat_stand_${dir}`);
    const b = img.bounds()!;
    assert.ok(b.w >= 15, `tall_coat ${dir} should keep full coat shoulders/sleeves (>=15px wide), got ${b.w}`);
  }
  // rogue studded jerkin keeps arms visible on both sides in N view
  const rn = p.image("rogue_cat_stand_n");
  const rb = rn.bounds()!;
  assert.ok(rb.w >= 13, `rogue_cat n should keep sleeves visible (>=13px wide), got ${rb.w}`);
});
