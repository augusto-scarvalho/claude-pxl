// 3D Mount & Mounted-Rider System (lib/characters/mounts.px.js):
// all 8 species, coats, compass presets, emission & dead shutoff, species-tailored ambient/combat/status moves,
// baked 3D & modular depth-clipped riders, mounts.swap(), and engine-agnostic mounts.export().
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { loadProject } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import type { Project } from "../src/core/project.ts";
import { root, whenChanged } from "./passed.ts";

const test = whenChanged("test/mounts.test.ts", [
  "lib/characters/mounts.px.js",
  "lib/characters/kit.px.js",
  "lib/characters/crew.px.js",
  "lib/characters/traveler.px.js",
  "lib/characters/dress.px.js",
  "lib/profiles/hd2d.px.js",
]);

const MOUNTS = join(root, "lib", "characters", "mounts.px.js").split(sep).join("/");
const INC = `include("${MOUNTS}", { as: "mounts", palette: true })\n`;
const loadArt = (src: string, name: string): Project => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-mounts-src-")), file = join(dir, name);
  try { writeFileSync(file, src); return loadProject(file); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const built = (p: Project, only: string[], f: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-mounts-"));
  try { writeOutputs(p, dir, { only, preview: false }); f(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const json = (dir: string, n: string) => JSON.parse(readFileSync(join(dir, n + ".json"), "utf8"));
const hasEmit = (e: Uint8Array | undefined) => !!e && e.some((v) => v > 0);
const opaqueCount = (d: Uint32Array) => { let n = 0; for (let i = 0; i < d.length; i++) if ((d[i] & 255) >= 128) n++; return n; };

test("all 8 mount species render cleanly with universal sockets, compass presets, and spectral/optic emission shutoff on dead", () => {
  const p = loadArt(INC + `
    mounts.mount("m_horse",  { species: "horse",             coat: "bay",       dirs: "8",            moves: ["stand"] })
    mounts.mount("m_war",    { species: "warhorse",          coat: "dapple",    dirs: "4",            moves: ["stand"] })
    mounts.mount("m_pony",   { species: "pony",              coat: "chestnut",  dirs: "4card",        moves: ["stand"] })
    mounts.mount("m_bone",   { species: "bone_steed",        coat: "ivory",     dirs: ["s", "sw", "w"], moves: ["stand", "downed", "dead"] })
    mounts.mount("m_bull",   { species: "war_aurochs",       coat: "aurochs",   dirs: ["s", "sw", "w"], moves: ["stand"] })
    mounts.mount("m_clock",  { species: "clockwork_strider", coat: "porcelain", dirs: ["s", "sw", "w"], moves: ["stand", "downed", "dead"] })
    mounts.mount("m_wolf",   { species: "wolf",              coat: "timber",    dirs: ["s", "sw", "w"], moves: ["stand", "dead"] })
    mounts.mount("m_wagon",  { species: "cart",              coat: "oak",       dirs: ["s", "sw", "w"], moves: ["stand", "walk", "downed", "dead"], canopy: true })
    mounts.mount("m_cart",   { species: "cart",              coat: "pine",      dirs: ["sw", "w"],      moves: ["stand", "dead"], canopy: false, draught: "war_aurochs" })
    mounts.mount("m_parked", { species: "cart",              coat: "oak",       dirs: ["w"],            moves: ["stand", "downed", "dead"], canopy: true, draught: "none" })
    mounts.mount("m_ghost",  { species: "cart",              coat: "ebony",     dirs: ["w"],            moves: ["stand", "dead"], canopy: true, draught: "bone_steed" })
  `, "mounts-species.px.js");

  // 8-dir horse, 4-diag warhorse, 4-cardinal pony
  for (const d of ["s", "sw", "w", "nw", "n", "ne", "e", "se"]) {
    const img = p.image(`m_horse_stand_${d}`);
    assert.ok(img.w > 0 && img.h > 0 && img.bounds() !== null, `horse ${d} should render non-empty`);
    for (const sock of ["saddle", "reins", "head_top", "center", "chest"]) {
      assert.ok(img.sockets?.[sock], `expected socket '${sock}' on horse ${d}`);
    }
  }
  for (const d of ["sw", "se", "nw", "ne"]) assert.ok(p.image(`m_war_stand_${d}`).bounds() !== null);
  for (const d of ["s", "w", "n", "e"]) assert.ok(p.image(`m_pony_stand_${d}`).bounds() !== null);
  for (const nm of ["m_bone", "m_bull", "m_clock", "m_wolf", "m_wagon"]) {
    for (const d of ["s", "sw", "w"]) {
      const img = p.image(`${nm}_stand_${d}`);
      assert.ok(img.bounds() !== null, `${nm} ${d} should render non-empty`);
      assert.ok(img.sockets?.saddle && img.sockets?.chest, `${nm} ${d} should expose saddle and chest sockets`);
    }
  }
  assert.ok(p.image("m_cart_stand_w").bounds() !== null);
  assert.ok(p.image("m_cart_dead_w").bounds() !== null);

  // Spectral rib/eye glow on bone_steed and amber optic glow on clockwork_strider: ON in stand/downed, OFF in dead!
  assert.ok(hasEmit(p.image("m_bone_stand_w").emit), "bone_steed should emit spectral soul-fire in stand");
  assert.ok(hasEmit(p.image("m_bone_downed_w").emit), "bone_steed should still emit soul-fire in downed");
  assert.ok(!hasEmit(p.image("m_bone_dead_w").emit), "bone_steed should extinguish soul-fire in dead");
  assert.ok(hasEmit(p.image("m_clock_stand_w").emit), "clockwork_strider should emit optic glow in stand");
  assert.ok(hasEmit(p.image("m_clock_downed_w").emit), "clockwork_strider should keep optic glow in downed");
  assert.ok(!hasEmit(p.image("m_clock_dead_w").emit), "clockwork_strider should extinguish optic glow in dead");
  assert.ok(!hasEmit(p.image("m_horse_stand_w").emit), "plain bay horse should not emit light");
  assert.ok(!hasEmit(p.image("m_wagon_stand_w").emit), "horse-drawn wooden wagon should not emit light");
  assert.ok(hasEmit(p.image("m_ghost_stand_w").emit), "bone_steed-drawn ghost coach should emit spectral soul-fire");
  assert.ok(!hasEmit(p.image("m_ghost_dead_w").emit), "bone_steed-drawn ghost coach should extinguish soul-fire on dead");

  // Hitched wagon is wider than parked unhitched wagon (draft horse harnessed in front!)
  assert.ok(p.image("m_wagon_stand_w").bounds()!.w > p.image("m_parked_stand_w").bounds()!.w + 15, "hitched wagon should include draft animal ahead of shafts");

  // Unhitched parked wagon downed stays completely stationary (no breathing motion between frames 0 and 1!)
  const wd = p.frames("m_parked_downed_w");
  assert.equal(wd.length, 2);
  assert.deepEqual(wd[0].img.data, wd[1].img.data, "unhitched wagon downed should not bounce/breathe between frames");
});

test("species-tailored ambient/combat/all presets, 8-frame charge, upright 6-frame rear, bite, gore, and 5-frame fall transition", () => {
  const p = loadArt(INC + `
    const hAll = mounts.mount("h_all",  { species: "horse",             dirs: ["w"], moves: "all" })
    const bAmb = mounts.mount("b_amb",  { species: "bone_steed",        dirs: ["w"], moves: "ambient" })
    const cAmb = mounts.mount("c_amb",  { species: "clockwork_strider", dirs: ["w"], moves: "ambient" })
    const wCom = mounts.mount("w_com",  { species: "wolf",              dirs: ["w"], moves: "combat" })
    const wAmb = mounts.mount("w_amb",  { species: "wolf",              dirs: ["w"], moves: "ambient" })
    const uCom = mounts.mount("u_com",  { species: "war_aurochs",       dirs: ["w"], moves: "combat" })
    const vAll = mounts.mount("v_all",  { species: "cart",              dirs: ["w"], moves: "all" })
    const has = (arr, sub) => arr.some((n) => n.includes("_" + sub + "_"))
    // Non-living/wheeled mounts exclude food/drink moves; cart also excludes rear!
    if (has(bAmb.names, "graze") || has(bAmb.names, "eat") || has(bAmb.names, "drink") || !has(bAmb.names, "rattle")) throw new Error("bone_steed ambient mismatch")
    if (has(cAmb.names, "graze") || has(cAmb.names, "eat") || has(cAmb.names, "drink") || !has(cAmb.names, "scan") || !has(cAmb.names, "vent")) throw new Error("clockwork ambient mismatch")
    if (!has(wAmb.names, "howl") || !has(wAmb.names, "sniff") || !has(wAmb.names, "eat") || !has(wAmb.names, "drink")) throw new Error("wolf ambient mismatch")
    if (!has(wCom.names, "bite") || !has(wCom.names, "fall")) throw new Error("wolf combat should auto-include bite and fall")
    if (!has(uCom.names, "gore") || !has(uCom.names, "fall")) throw new Error("war_aurochs combat should auto-include gore and fall")
    if (!has(hAll.names, "rear") || !has(hAll.names, "graze") || !has(hAll.names, "fall")) throw new Error("horse all preset mismatch")
    if (has(vAll.names, "rear") || has(vAll.names, "charge") || has(vAll.names, "graze") || has(vAll.names, "drink") || !has(vAll.names, "walk") || !has(vAll.names, "fall")) throw new Error("cart all preset should exclude combat/food moves")
  `, "mounts-moves.px.js");

  assert.equal(p.frames("h_all_walk_w").length, 6);
  assert.equal(p.frames("h_all_charge_w").length, 8);
  assert.equal(p.frames("h_all_rear_w").length, 6);
  assert.equal(p.frames("h_all_fall_w").length, 5);
  assert.equal(p.frames("h_all_downed_w").length, 2);
  assert.equal(p.frames("h_all_dead_w").length, 1);
  assert.equal(p.frames("w_com_bite_w").length, 6);
  assert.equal(p.frames("u_com_gore_w").length, 6);

  // Fall frame 4 lands seamlessly in downed state and records downed metadata flag
  const fall = p.frames("h_all_fall_w");
  assert.equal(fall[4].img.info?.downed, true, "final fall frame should mark downed: true");
  assert.equal(p.frames("h_all_dead_w")[0].img.info?.dead, true, "dead frame should mark dead: true");
});

test("baked 3D mounted riders, mounted combat (rear_strike, slash, bite, gore), and modular depth-clipped 2/3-layer composition", () => {
  const p = loadArt(INC + `
    const KNIGHT = { body: "tall", outfit: "knight", cloak: "travel", held: "spear", off: "tallshield", colors: { plate: "steel", apron: "red", cloak: "red" } }
    const RANGER = { body: "short", outfit: "ranger", off: "bow", back: "quiver" }
    const DRIVER = { outfit: "peasant", headwear: "straw" }
    // Baked 3D mounted units across species & moves
    mounts.mounted("cav_lancer", KNIGHT, { species: "warhorse", coat: "dapple", dirs: ["sw", "w"], moves: ["stand", "charge", "rear", "rear_strike", "thrust"] })
    mounts.mounted("wolf_scout", RANGER, { species: "wolf",     coat: "timber", dirs: ["w"],       moves: ["stand", "bite", "shoot"] })
    mounts.mounted("wagon_drv",  DRIVER, { species: "cart",     coat: "oak",    dirs: ["sw", "nw", "n"], moves: ["stand"], canopy: true })
    // Modular 2-layer (clip: "mount") & 3-layer (front: true + clip: "barrel") vs unclipped (clip: "none")
    const m3 = mounts.mount("mod_horse", { species: "horse", coat: "bay", dirs: ["sw"], moves: ["stand"], front: true })
    if (!m3.fronts?.length) throw new Error("front: true should produce foreground mount layer")
    mounts.rider("r_clip_full",   KNIGHT, { species: "horse", dirs: ["sw"], moves: ["stand"], clip: "mount",  align: "saddle" })
    mounts.rider("r_clip_barrel", KNIGHT, { species: "horse", dirs: ["sw"], moves: ["stand"], clip: "barrel", align: "ground" })
    mounts.rider("r_clip_none",   KNIGHT, { species: "horse", dirs: ["sw"], moves: ["stand"], clip: "none",   align: "saddle" })
  `, "mounts-riders.px.js");

  // Baked mounted combat & sockets
  for (const nm of ["cav_lancer_stand_w", "cav_lancer_charge_w", "cav_lancer_rear_w", "cav_lancer_rear_strike_w", "cav_lancer_thrust_w", "wolf_scout_bite_w", "wolf_scout_shoot_w", "wagon_drv_stand_nw", "wagon_drv_stand_n"]) {
    const fr = p.frames(nm);
    assert.ok(fr.length >= 1 && fr[0].img.bounds() !== null, `${nm} should render non-empty`);
  }
  assert.equal(p.frames("cav_lancer_rear_strike_w").length, 6);
  const s0 = p.image("cav_lancer_stand_w").sockets;
  for (const sock of ["saddle", "reins", "chest", "head_top", "center"]) {
    assert.ok(s0?.[sock], `baked mounted figure should carry socket '${sock}'`);
  }

  // Modular depth clipping removes occluded rider pixels behind the horse barrel/neck
  const fullPx = opaqueCount(p.image("r_clip_full_stand_sw").data);
  const barrelPx = opaqueCount(p.image("r_clip_barrel_stand_sw").data);
  const nonePx = opaqueCount(p.image("r_clip_none_stand_sw").data);
  assert.ok(fullPx > 0 && barrelPx > 0 && nonePx > 0);
  assert.ok(fullPx < nonePx, `clip: "mount" (${fullPx}) should clip occluded pixels compared to clip: "none" (${nonePx})`);
  assert.ok(barrelPx < nonePx, `clip: "barrel" (${barrelPx}) should clip occluded far leg compared to clip: "none" (${nonePx})`);
  assert.ok(p.image("mod_horse_front_stand_sw").bounds() !== null, "3-layer front overlay should render foreground neck/head");
  assert.ok(p.image("r_clip_full_stand_sw").sockets?.saddle, "modular rider should expose saddle socket");
});

test("mounts.swap() and mounts.export() across atlas, per-dir and strips layouts plus option validation", () => {
  const p = loadArt(INC + `
    const SPEC = { species: "warhorse", coat: "dapple", colors: { caparison: "red", trim: "mustard" } }
    const ALT = mounts.swap(SPEC, { coat: "black", caparison: "navy", trim: "silver" })
    mounts.export("atlas_steed", SPEC, {
      layout: "atlas", dirs: ["w"], moves: ["stand", "rear"],
      format: "grid", pad: 1, extrude: 1, scale: 2, front: true,
      aliases: { moves: { rear: "empinar" }, dirs: { w: "left" }, sockets: { saddle: "seat" } },
      slots: { night: ALT },
      meta: { faction: "royal" },
    })
    mounts.export("dir_wolf", { species: "wolf", coat: "timber" }, {
      layout: "per-dir", dirs: ["w"], moves: ["stand", "bite"], format: "array",
      aliases: { dirs: { w: "l" } },
    })
    mounts.export("strip_cav", { species: "horse", coat: "bay" }, {
      layout: "strips", dirs: ["w"], moves: ["stand"], format: "hash",
      rider: { outfit: "ranger", off: "bow" },
    })
  `, "mounts-export.px.js");

  built(p, ["atlas_steed", "atlas_steed_front", "dir_wolf_l", "strip_cav_stand_w"], (dir) => {
    const a = json(dir, "atlas_steed");
    assert.equal(a.format, "grid");
    assert.equal(a.meta.layout, "atlas");
    assert.equal(a.meta.mount.species, "warhorse");
    assert.equal(a.meta.faction, "royal");
    assert.equal(a.scale, 2);
    assert.deepEqual(a.meta.dirs, ["left"]);
    assert.equal(a.meta.moves.empinar.source, "rear");
    assert.equal(a.meta.moves.empinar.frames, 6);
    assert.ok(a.meta.sockets.includes("seat"));
    const f0 = a.frames.find((f: { name: string }) => f.name === "stand_left_0");
    assert.ok(f0?.sockets?.seat, "aliased saddle->seat socket present in frame JSON");
    assert.ok(a.meta.slots?.night, "palette slot present in JSON");
    assert.notDeepEqual(a.meta.slots.night, a.meta.palette, "mounts.swap() should remap rendered mount colors");
    assert.ok(existsSync(join(dir, "atlas_steed.night.hex")));
    assert.ok(existsSync(join(dir, "atlas_steed_n.png")));
    assert.ok(existsSync(join(dir, "atlas_steed_front.png")), "front: true should export companion _front atlas");

    const d = json(dir, "dir_wolf_l");
    assert.ok(Array.isArray(d.frames));
    assert.equal(d.meta.layout, "per-dir");
    assert.equal(d.meta.dir, "l");
    assert.equal(d.meta.moves.bite.frames, 6);

    const s = json(dir, "strip_cav_stand_w");
    assert.equal(s.meta.layout, "strips");
    assert.equal(s.meta.mount.mode, "mounted");
    assert.ok(s.frames.stand_0);
  });

  // Validation errors
  assert.throws(() => loadArt(INC + `mounts.mount("x", { species: "dragon" })`, "e.px.js"), /no species 'dragon'/);
  assert.throws(() => loadArt(INC + `mounts.mount("x", { species: "cart", draught: "cart" })`, "e.px.js"), /cart draught cannot be another vehicle/);
  assert.throws(() => loadArt(INC + `mounts.mount("x", { species: "horse", coat: "neon" })`, "e.px.js"), /no coat 'neon'/);
  assert.throws(() => loadArt(INC + `mounts.mount("x", { species: "horse", moves: ["fly"] })`, "e.px.js"), /no move 'fly'/);
  assert.throws(() => loadArt(INC + `mounts.rider("x", {}, { species: "horse", clip: "head" })`, "e.px.js"), /clip must be "mount", "barrel" or "none"/);
  assert.throws(() => loadArt(INC + `mounts.rider("x", {}, { species: "horse", align: "head" })`, "e.px.js"), /align must be "saddle" or "ground"/);
  assert.throws(() => loadArt(INC + `mounts.export("x", {}, { bogus: 1 })`, "e.px.js"), /unknown option 'bogus'/);
  assert.throws(() => loadArt(INC + `mounts.export("x", {}, { layout: "grid" })`, "e.px.js"), /layout must be "atlas", "per-dir" or "strips"/);
  assert.throws(() => loadArt(INC + `mounts.export("x", {}, { mode: "pet" })`, "e.px.js"), /mode must be "mount", "mounted" or "rider"/);
  assert.throws(() => loadArt(INC + `mounts.export("x", {}, { dirs: "16" })`, "e.px.js"), /unknown dirs preset '16'/);
  assert.throws(() => loadArt(INC + `mounts.export("x", {}, { moves: "dance" })`, "e.px.js"), /moves must be "basic", "ambient", "combat", "all"/);
});
