// The library (lib/): its cards (card()), the catalog and an entry's card (pxl lib), a draft (pxl lib draft).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pack } from "../src/core/color.ts";
import { Img } from "../src/core/image.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { cardLines, checkProject } from "../src/node/check.ts";
import { catalog, findEntry, libCard, libDraft, libList } from "../src/node/lib.ts";
import { encodePng } from "../src/node/png.ts";
import { failure } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const LIB = (readdirSync("lib", { recursive: true }) as string[]).filter((f) => f.endsWith(".px.js")).map((f) => `lib/${f.replaceAll("\\", "/")}`).sort();
const test = whenChanged("test/lib.test.ts", LIB);

test("card(): kept by its full name, its data given back; a name or an asset it can't find fails at its line", () => {
  const p = loadSource(`sprite("_post", "1"); card("_post", { is: "a post", cells: { "side/16": "✓", "hd2d/24": ["◐", "_post"] } })\nsprite("_back", { w: card("_post").is.length }, "1")`);
  assert.deepEqual(p.cards.get("_post")!.cells, { "side/16": { status: "✓", asset: "_post" }, "hd2d/24": { status: "◐", asset: "_post" } });
  assert.deepEqual([p.cards.get("_post")!.kind, p.image("_back").w], ["sprite", 6]);
  assert.match(failure(`sprite("_post", "1")\ncard("_pots", { is: "a post", cells: { "side/16": "✓" } })`).message, /t\.px\.js:2.*card '_pots': '_pots' is no asset.*defined before it.*_post/);
  assert.match(failure(`sprite("_post", "1")\ncard("_post", { is: "a post", cells: { "side/16": ["✓", "_gone"] } })`).message, /t\.px\.js:2.*cell side\/16's asset '_gone'/);
  assert.match(failure(`sprite("_post", "1")\ncard("_post", { is: "a post", cells: { "side/16": "ok" } })`).message, /cell side\/16 is a status/);
  assert.match(failure(`sprite("_post", "1")\ncard("_post", { is: "a post", cells: { "front/16": "✓" } })`).message, /the camera one of side, topdown/);
  assert.match(failure(`card("make3d.oak", { is: "an oak", cells: { "side/32": "◐" } })`).message, /make3d\.oak is no builder/);
  // a builder's ◐ cell may name no asset; its ✓ can't
  const b = loadSource(`make3d.define("post", () => ({ field: sdf.sphere(1) }))\ncard("make3d.post", { is: "a ball", cells: { "side/32": "◐" }, tiles: 1, draw: { light: [0, 0, 1] } })`);
  assert.deepEqual([b.cards.get("make3d.post")!.kind, b.cards.get("make3d.post")!.cells["side/32"]], ["builder", { status: "◐" }]);
  assert.match(failure(`make3d.define("post", () => ({ field: sdf.sphere(1) }))\ncard("make3d.post", { is: "a ball", cells: { "side/32": "✓" } })`).message, /names no asset/);
  // a builder's tiles: a box [tall, wide], or its height alone; a cell's density px a meter (24ppm)
  const box = loadSource(`make3d.define("post", () => ({ field: sdf.sphere(1) }))\ncard("make3d.post", { is: "a ball", cells: { "hd2d/24ppm": "◐" }, tiles: [1, 2] })`);
  assert.equal(JSON.stringify([box.cards.get("make3d.post")!.tiles, Object.keys(box.cards.get("make3d.post")!.cells)]), '[[1,2],["hd2d/24ppm"]]');
  assert.match(failure(`make3d.define("post", () => ({ field: sdf.sphere(1) }))\ncard("make3d.post", { is: "a ball", cells: { "side/32": "◐" }, tiles: [1] })`).message, /tiles is its box in tiles, \[tall, wide\]/);
  assert.match(failure(`sprite("_post", "1")\ncard("_post", { is: "a post", cells: { "hd2d/24m": "✓" } })`).message, /px a meter \(24ppm\)/);
  // its category on a genre's scale, a word
  assert.equal(loadSource(`sprite("_post", "1"); card("_post", { is: "a post", cells: { "side/16": "✓" }, category: "lamp" })`).cards.get("_post")!.category, "lamp");
  assert.match(failure(`sprite("_post", "1")\ncard("_post", { is: "a post", cells: { "side/16": "✓" }, category: ["lamp"] })`).message, /category is a key of a genre's scale/);
});

test("genre(): its density a tile's px or px a meter, its mix said; its cell as pxl lib reads it", () => {
  assert.match(failure(`genre("g", { ppm: -1 })`).message, /ppm is its px a meter/);
  assert.match(failure(`genre("g", { mix: "yes" })`).message, /mix: true declares densities mixed on purpose/);
  const { genres } = catalog();
  assert.deepEqual(["hd2d", "topdown16", "racing_behind"].map((g) => genres.get(g)!.cell), ["hd2d/24ppm", "topdown/16", "behind/?"]);
  assert.deepEqual([genres.get("topdown16")!.g.pitch, genres.get("hd2d")!.g.mix], [30, true]);
  assert.match(libList({ cell: "hd2d/17ppm" }).join("\n"), /crates\._crate_face +sprite +hd2d\/17ppm ✓/);
});

test("pxl lib: the catalog by subject, filters by cell and genre", () => {
  const all = libList();
  assert.match(all[0], /^pxl's library \(lib\/\), by subject/);
  assert.ok(all.some((l) => /^props +lib\/props: crates lamps$/.test(l)));
  assert.throws(() => libList({ cell: "side/x" }), /--cell is <camera>\/<density>/);
  assert.throws(() => libList({ genre: "racing-behind" }), /no genre 'racing-behind' in lib\/profiles/);
  assert.throws(() => findEntry("nothing.here"), /no entry 'nothing\.here' in the library/);
});

test("pxl lib <entry>: a card with what a build of it reads; --genre hd2d lists its cell", () => {
  const lamp = libCard("lamps._lamp").join("\n"), oak = libCard("make3d.oak").join("\n"), tr = libCard("traveler.tr").join("\n");
  assert.match(lamp, /take +include\("lib\/props\/lamps\.px\.js", \{ as: "lamps" \}\)/);
  assert.match(lamp, /source +2D by hand \(rect\)\n.*\n +size +7x30, pivot 3\.5,30\n/);
  assert.match(lamp, /roles +frame F, light Ll: base "lamps\._lamp", swap: roleSwap\(lamps\.ROLES\._lamp/);
  assert.match(oak, /params +height 0\.5\.\.40, season spring summer autumn bare, color 0\.\.9/);
  assert.match(oak, /parts +trunk, crown; sockets top\n/);
  assert.match(oak, /size +2\.5 x 2\.5 tiles \(tall x wide\): 40x40 px at 16, 80x80 px at 32, 320x320 px at 128/);
  assert.match(tr, /source +hybrid: 3D \(surface, decal\)/);
  assert.match(tr, /size +26x40, pivot 13,38; 8 x 110 ms/);
  assert.match(tr, /sockets hand \(cast\).*sheet traveler/);
  assert.match(tr, /moves +walk 8 x 110 ms, idle 4 x 250 ms, kneel 7 x 160 ms \(n ne e se s sw w nw\); cast 13 x 100 ms \(e se sw w\); turn 1 x 250 ms \(16 headings\)/);
  const hd2d = libList({ genre: "hd2d" }).join("\n");
  assert.match(hd2d, /lamps\._lamp +sprite +hd2d\/24ppm/);
  assert.match(hd2d, /make3d\.oak +builder +.*hd2d\/24ppm ◐/);
  assert.doesNotMatch(hd2d, /_lamp_tiny|make3d\.birch/);
});

test("pxl lib draft: a builder at a cell it lacks, written and built; a 2D entry refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-draft-"));
  const said = libDraft("make3d.chozubachi", { cell: "side/16" }, dir).join("\n");
  assert.match(said, /make3d\.chozubachi at side\/16: 0\.75 tiles tall \(its card's\) on a 16 px grid: 12 px tall; drawn 1[12] tall/);
  const art = readFileSync(join(dir, "chozubachi_side16.px.js"), "utf8");
  assert.match(art, /turnaround\("chozubachi_side16", make3d\.chozubachi\(\), \{ \.\.\.card\("make3d\.chozubachi"\)\.draw, view: \{ kind: "side", pitch: 0 \}/);
  assert.ok(existsSync(join(dir, "sprites", "chozubachi_side16_s.png")));
  assert.throws(() => libDraft("lamps._lamp", { cell: "side/16" }, dir), /drawn in 2D: at a new density it is redrawn simpler/);
  // by a genre: its camera at the figure's pitch, fitted to the card's box (neither side over), its tones and line
  const rock = libDraft("make3d.rock", { genre: "topdown16" }, dir).join("\n"), m = /drawn (\d+) tall, (\d+) wide/.exec(rock)!;
  assert.match(rock, /seen from 30 degrees \(the figure's; the ground's 45\), in 3 tones, a line of #1a1620 all round/);
  assert.ok(+m[1] <= 32 && +m[2] <= 32 && Math.max(+m[1], +m[2]) >= 31, rock);
  assert.match(readFileSync(join(dir, "rock_topdown16.px.js"), "utf8"), /genre\("topdown16", \{ camera: \{ kind: "topdown", pitch: 45 \}, pitch: 30, grid: 16, tones: 3, ink: "#1a1620" \}\)\nturnaround\("rock_topdown16".*surface: \{ \.\.\.card\("make3d\.rock"\)\.draw\?\.surface, ink: "#1a1620" \}, view: \{ kind: "side", pitch: 30 \}/);
  assert.throws(() => libDraft("make3d.rock", { genre: "racing_behind" }, dir), /its camera is behind; lib draft draws side, topdown, iso, hd2d/);
  // hd2d: a billboard from its figure's 20 degrees, fitted to the genre's box for the card's category (a bush 0.5 m
  // tall, 0.8 across: 12 x 19 px at 24 px a meter), not at the builder's own height
  const bush = libDraft("make3d.bush", { genre: "hd2d" }, dir).join("\n"), o = /drawn (\d+) tall, (\d+) wide/.exec(bush)!;
  assert.match(bush, /a box 0\.5 m tall, 0\.8 wide \(hd2d's bush\) at 24 px a meter: 12 px tall, 19 wide; .* \(drawn 0\.\d m at 24\), seen from 20 degrees as a billboard/);
  assert.ok(+o[1] <= 12 && +o[2] <= 19 && (+o[1] >= 12 || +o[2] >= 18), bush);
  assert.match(readFileSync(join(dir, "bush_hd2d.px.js"), "utf8"), /view: \{ kind: "side", pitch: 20 \}/);
});

test("pxl check: densities mixed by accident (library entries of two in a scene, a png blown up or shrunk alone), unless a genre says the mix", () => {
  const mix = (g: string) => loadSource(`sprite("_a", "1"); sprite("_b", "11")
card("_a", { is: "a", cells: { "topdown/16": "✓" } }); card("_b", { is: "b", cells: { "topdown/32": "✓" } })${g}
sprite("_c", { base: "_b" })
scene("yard", { w: 8, h: 8 }, stamp("_a", 1, 1), stamp("_c", 4, 4))`);
  const r = checkProject(mix(""));
  assert.match(r.lines.join("\n"), /yard › WARNING: it places library entries of 2 densities \(_a at topdown\/16; _c at topdown\/32\): pixels of different sizes side by side/);
  assert.match(r.coverage, /densities on 1/);
  assert.deepEqual(checkProject(mix(`\ngenre("td32", { camera: { kind: "topdown" }, grid: 32, mix: true })`)).lines, []);
  // a png blown up 2 times; one shrunk back from it (its own pixels again); a finer drawing shrunk
  const dir = mkdtempSync(join(tmpdir(), "pxl-mix-")), im = new Img(4, 4);
  for (let i = 0; i < 16; i++) im.data[i] = pack(40 + 50 * (i % 3), 60, 90 + (i >> 2) * 30, 255);
  writeFileSync(join(dir, "big.png"), encodePng(im.scale(2)));
  writeFileSync(join(dir, "fine.png"), encodePng(im));
  writeFileSync(join(dir, "art.px.js"), `sprite("big", { png: "big.png" })\nsprite("back", { png: "big.png", shrink: 2 })\nsprite("small", { png: "fine.png", shrink: 2 })\n`);
  const lines = checkProject(loadProject(join(dir, "art.px.js"))).lines.join("\n");
  assert.match(lines, /big › WARNING: its png is drawn 2 times as big: every 2x2 block is one color.*shrink: 2 brings it to its own/);
  assert.match(lines, /small › WARNING: shrink: 2 scales a finer drawing down alone: 100% of its 2x2 blocks/);
  assert.doesNotMatch(lines, /back ›/);
});

test("pxl check on cards: a cell's status against how its asset is drawn; clean on lib/", () => {
  const p = loadSource(`sprite("_ball", { w: 9, h: 9 }, surface(sdf.sphere(0.25), { view: "side", ppm: 16, mats: { solid: "0567" } }))
sprite("_post", "1")
card("_ball", { is: "a ball", cells: { "side/16": "✓", "iso/16": "✎" } })
card("_post", { is: "a post", cells: { "side/16": "◐" } })`);
  const lines = cardLines(p).lines.join("\n");
  assert.match(lines, /_ball \(art\.px\.js:3:1\) › WARNING: its card's cell side\/16 is ✓, but '_ball' is a live 3D sprite: freeze it/);
  assert.match(lines, /cell iso\/16 is ✎ \(by hand over a 3D draft\), but '_ball' is the 3D render alone/);
  assert.match(lines, /_post .*cell side\/16 is ◐ \(a 3D render to look at\), but '_post' is drawn by hand/);
  for (const f of LIB) assert.deepEqual(cardLines(loadProject(f, { checksOnly: true }), f.replace(/^.*\//, "")).lines, [], f);
});
