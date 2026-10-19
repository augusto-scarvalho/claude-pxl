// Renders the README gallery (docs/gallery/) from the examples: clean nearest-neighbour upscales,
// GIFs for animated assets. Run: node scripts/gallery.ts [asset ...] (all, or only those)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeGif } from "../src/node/gif.ts";
import { loadProject } from "../src/node/load.ts";
import { encodePng } from "../src/node/png.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs", "gallery");
mkdirSync(out, { recursive: true });

// [example file, asset, target width in px, every nth frame (long loops: each kept frame lasts n
// times as long, so the loop still closes and the GIF stays a few MB)]
const shots: [string, string, number, number?][] = [
  ["no_magic.px.js", "no_magic_night", 768],
  ["shop.px.js", "comet_repair", 576],
  ["tackle.px.js", "gull_and_gill", 576],
  ["moon_bakery_3d.px.js", "moon_buns_3d", 576],
  ["neon_noodle_3d.px.js", "neon_noodle_3d", 576],
  ["cave.px.js", "cave", 576],
  ["no_magic.px.js", "cat", 192],
  ["no_magic.px.js", "frog", 192],
  ["no_magic.px.js", "clock", 192],
  ["cyberpunk/sodium_hour.px.js", "sodium_hour", 640, 3],
  ["cyberpunk/pipeline/cyberpunk_city.px.js", "cyberpunk_city", 640, 3],
  ["perspective/road.px.js", "road", 640],
  ["perspective/road.px.js", "plaza", 640],
];

const only = process.argv.slice(2);
for (const [file, name, width, every = 1] of shots.filter(([, n]) => !only.length || only.includes(n))) {
  const p = loadProject(join(root, "examples", file));
  const b = p.build(name);
  const s = Math.max(1, Math.floor(width / b.img.w));
  if (b.anim) {
    const frames = p.frames(name).filter((_, i) => i % every === 0).map((f) => ({ img: f.img.scale(s), ms: f.ms * every }));
    writeFileSync(join(out, name + ".gif"), encodeGif(frames));
  } else writeFileSync(join(out, name + ".png"), encodePng(b.img.scale(s)));
  console.log(`${name} ${b.img.w}x${b.img.h} @${s}x`);
}
