// Renders the README gallery (docs/gallery/) from the examples: clean nearest-neighbour upscales,
// GIFs for animated assets. Run: node scripts/gallery.ts [asset ...] [--out DIR] [--every N] (all, or only
// those; --out writes them elsewhere: a look at one before it's done, which isn't committed; --every N
// builds one frame in N, each lasting N times as long: a quick look at a long story)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeGif } from "../src/node/gif.ts";
import { loadProject } from "../src/node/load.ts";
import { encodePng } from "../src/node/png.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), at = args.indexOf("--out")
const out = at >= 0 ? args.splice(at, 2)[1] : join(root, "docs", "gallery");
const ev = args.indexOf("--every"), EVERY = ev >= 0 ? Math.max(1, Math.floor(+args.splice(ev, 2)[1])) : 0;
mkdirSync(out, { recursive: true });

// [example file, asset, target width in px, every nth frame (each kept frame lasts n times as long, so
// the loop still closes), the file's name when it isn't the asset's]
const shots: [string, string, number, number?, string?][] = [
  ["no_magic.px.js", "no_magic_night", 768],
  ["shop.px.js", "comet_repair", 576],
  ["tackle.px.js", "gull_and_gill", 576],
  ["moon_bakery_3d.px.js", "moon_buns_3d", 576],
  ["neon_noodle_3d.px.js", "neon_noodle_3d", 576],
  ["cave.px.js", "cave", 576],
  ["no_magic.px.js", "cat", 192],
  ["no_magic.px.js", "frog", 192],
  ["no_magic.px.js", "clock", 192],
  ["cyberpunk/sodium_hour.px.js", "sodium_hour", 640],
  ["cyberpunk/pipeline/cyberpunk_city.px.js", "cyberpunk_city", 640],
  ["perspective/road.px.js", "road", 640],
  ["perspective/park.px.js", "park", 640],
  ["perspective/extinction.px.js", "extinction", 640],
  ["parallax/train.px.js", "train", 640, 1, "parallax_train"],
  ["perspective/race.px.js", "race", 640, 1, "race_cockpit"],
  ["sunset/sunset.px.js", "sunset", 640, 1, "sunset_cliff"],
  ["rig/tournament.px.js", "tournament", 640],
  ["halloween/party.px.js", "party", 640, 1, "halloween_party"],
  ["tropical/forest.px.js", "forest", 640, 1, "tropical_forest"],
  ["hd2d/graveyard.px.js", "graveyard_md", 640, 1, "hd2d_graveyard"],
  ["hd2d/harbor.px.js", "harbor_clip", 640, 1, "hd2d_harbor"],
  ["hd2d/clearing.px.js", "clearing_md", 640, 1, "hd2d_clearing"],
  ["sdf/decals.px.js", "grove_showcase", 640, 1, "sdf_grove"],
  ["spell_variants.px.js", "ice_earth", 1168, 1, "spells_ice_earth"],
  ["shrine/shrine.px.js", "shrine", 640, 1, "shrine_autumn"],
];

const only = args;
for (const [file, name, width, every0 = 1, as = name] of shots.filter(([, n, , , a]) => !only.length || only.includes(n) || only.includes(a ?? ""))) {
  const p = loadProject(join(root, "examples", file));
  const b = p.build(name);
  const s = Math.max(1, Math.floor(width / b.img.w)), every = EVERY || every0, tl = b.anim;
  if (tl) {
    // one frame in N: only those built (on a clock; frames of their own lengths are all built)
    const frames = every > 1 && !tl.durations
      ? Array.from({ length: Math.ceil(Math.round(tl.loop / tl.step) / every) }, (_, i) => ({ img: p.build(name, 0, i * every * tl.step).img.scale(s), ms: tl.step * every }))
      : p.frames(name).filter((_, i) => i % every === 0).map((f) => ({ img: f.img.scale(s), ms: f.ms * every }));
    writeFileSync(join(out, as + ".gif"), encodeGif(frames));
  } else writeFileSync(join(out, as + ".png"), encodePng(b.img.scale(s)));
  console.log(`${name} ${b.img.w}x${b.img.h} @${s}x`);
}
