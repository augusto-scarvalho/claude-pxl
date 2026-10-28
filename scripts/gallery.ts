// Renders the README gallery (docs/gallery/) from the examples: clean nearest-neighbour upscales,
// GIFs for animated assets. Run: node scripts/gallery.ts [asset ...] [--out DIR] [--every N] (all, or only
// those; --out writes them elsewhere: a look at one before it's done, which isn't committed; --every N
// builds one frame in N, each lasting N times as long: a quick look at a long story). --lib: the
// library's sheets instead (docs/gallery/lib/<subject>.png, shown by lib/README.md)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pack } from "../src/core/color.ts";
import { glyph, lineWidth } from "../src/core/font.ts";
import { Img } from "../src/core/image.ts";
import type { Project } from "../src/core/project.ts";
import { encodeGif } from "../src/node/gif.ts";
import { catalog, libDraft, members } from "../src/node/lib.ts";
import { loadProject } from "../src/node/load.ts";
import { decodePng, encodePng } from "../src/node/png.ts";

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

// --lib: a contact sheet per subject, each card's cells at frame 0 (a family's s heading), bottoms aligned,
// its name under each and its cell beside a swatch of its status (green ✓, amber ◐, blue ✎), at 2x; a
// builder's first cell with no asset drafted here, once (a cell with no grid at 24 px), as pxl lib draft does
if (args.includes("--lib")) {
  const dir = join(out, "lib"), tmp = mkdtempSync(join(tmpdir(), "pxl-lib-")), BG = pack(205, 195, 176, 255), INK = pack(58, 50, 46, 255);
  const STATUS: Record<string, number> = { "✓": pack(74, 138, 74, 255), "◐": pack(192, 138, 42, 255), "✎": pack(74, 106, 168, 255) };
  const loads = new Map<string, Project>(), proj = (f: string) => loads.get(f) ?? loads.set(f, loadProject(f)).get(f)!;
  const label = (img: Img, s: string, x: number, y: number) => { for (const ch of s) { glyph(ch).forEach((r, j) => [...r].forEach((v, i) => v === "#" && img.set(x + i, y + j, INK))); x += glyph(ch)[0].length + 1; } };
  const sheets = new Map<string, { img: Img; name: string; cell: string; status: string }[]>();
  mkdirSync(dir, { recursive: true });
  for (const e of catalog().entries) for (const [cell, v] of Object.entries(e.card.cells).filter(([, v], i, all) => v.asset || all.findIndex(([, u]) => !u.asset) === i)) {
    let img: Img;
    if (v.asset) { const p = proj(e.file), ms = members(p, v.asset); img = p.build(ms.find((n) => /_s$/.test(n)) ?? ms[0]).img; }
    else {
      const [cam, g] = cell.split("/"), at = `${cam}/${g === "?" ? 24 : g}`;
      libDraft(e.name, { cell: at }, tmp);
      img = decodePng(readFileSync(join(tmp, "sprites", `${e.card.name.slice(7)}_${at.replace("/", "")}_s.png`)));
    }
    (sheets.get(e.subject) ?? sheets.set(e.subject, []).get(e.subject)!).push({ img, name: e.card.name.replace(/^make3d\./, ""), cell, status: v.status });
  }
  for (const [subject, cells] of sheets) {
    // rows of up to 320 px (one drawing wider: its own), each cell as wide as its drawing or its labels
    const G = 4, wOf = (c: (typeof cells)[number]) => Math.max(c.img.w, lineWidth(c.name), lineWidth(c.cell) + 5), W = Math.max(320, ...cells.map((c) => wOf(c) + 2 * G));
    const rows: (typeof cells)[] = [[]];
    let x = G;
    for (const c of cells) { if (x + wOf(c) + G > W && rows[rows.length - 1].length) { rows.push([]); x = G; } rows[rows.length - 1].push(c); x += wOf(c) + G; }
    const tall = (r: typeof cells) => Math.max(...r.map((c) => c.img.h)), sheet = new Img(W, rows.reduce((s, r) => s + tall(r) + 14 + G, G)).fill(BG);
    let y = G;
    for (const r of rows) {
      let xx = G;
      for (const c of r) {
        sheet.blit(c.img, xx, y + tall(r) - c.img.h);
        label(sheet, c.name, xx, y + tall(r) + 2);
        for (let i = 0; i < 9; i++) sheet.set(xx + (i % 3), y + tall(r) + 9 + Math.floor(i / 3), STATUS[c.status]);
        label(sheet, c.cell, xx + 5, y + tall(r) + 8);
        xx += wOf(c) + G;
      }
      y += tall(r) + 14 + G;
    }
    writeFileSync(join(dir, `${subject}.png`), encodePng(sheet.scale(2)));
    console.log(`lib/${subject}.png: ${cells.length} cells, ${sheet.w * 2}x${sheet.h * 2}`);
  }
  rmSync(tmp, { recursive: true, force: true });
}

const only = args.filter((a) => a !== "--lib");
for (const [file, name, width, every0 = 1, as = name] of (args.includes("--lib") ? [] : shots).filter(([, n, , , a]) => !only.length || only.includes(n) || only.includes(a ?? ""))) {
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
