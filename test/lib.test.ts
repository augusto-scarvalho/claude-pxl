// The library (lib/): its cards (card()), the catalog and an entry's card (pxl lib), a draft (pxl lib draft).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadProject, loadSource } from "../src/node/load.ts";
import { cardLines } from "../src/node/check.ts";
import { findEntry, libCard, libDraft, libList } from "../src/node/lib.ts";
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
});

test("pxl lib: the catalog by subject, filters by cell and genre", () => {
  const all = libList();
  assert.match(all[0], /^pxl's library \(lib\/\), by subject/);
  assert.ok(all.some((l) => /^props +lib\/props: crates lamps$/.test(l)));
  assert.throws(() => libList({ cell: "side/x" }), /--cell is <camera>\/<grid>/);
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
  assert.match(oak, /size +2\.5 tiles tall: 40 px at 16, 80 px at 32, 320 px at 128/);
  assert.match(tr, /source +hybrid: 3D \(surface, decal\)/);
  assert.match(tr, /size +26x40, pivot 13,38; 8 x 110 ms/);
  assert.match(tr, /sockets hand \(cast\).*sheet traveler/);
  assert.match(tr, /moves +walk 8 x 110 ms, idle 4 x 250 ms, kneel 7 x 160 ms \(n ne e se s sw w nw\); cast 13 x 100 ms \(e se sw w\); turn 1 x 250 ms \(16 headings\)/);
  const hd2d = libList({ genre: "hd2d" }).join("\n");
  assert.match(hd2d, /lamps\._lamp +sprite +hd2d\/24/);
  assert.doesNotMatch(hd2d, /_lamp_tiny|make3d\.oak/);
});

test("pxl lib draft: a builder at a cell it lacks, written and built; a 2D entry refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-draft-"));
  const said = libDraft("make3d.chozubachi", "side/16", dir).join("\n");
  assert.match(said, /make3d\.chozubachi at side\/16: 0\.75 tiles \(12 px\) tall/);
  const art = readFileSync(join(dir, "chozubachi_side16.px.js"), "utf8");
  assert.match(art, /turnaround\("chozubachi_side16", make3d\.chozubachi\(\), \{ \.\.\.card\("make3d\.chozubachi"\)\.draw, view: \{ kind: "side", pitch: 0 \}/);
  assert.ok(existsSync(join(dir, "sprites", "chozubachi_side16_s.png")));
  assert.throws(() => libDraft("lamps._lamp", "side/16", dir), /drawn in 2D: at a new density it is redrawn simpler/);
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
