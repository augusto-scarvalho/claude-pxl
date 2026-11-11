// The library (lib/): its cards (card()), the catalog and an entry's card (pxl lib), a draft (pxl lib draft).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import { pack } from "../src/core/color.ts";
import { Img } from "../src/core/image.ts";
import { lch } from "../src/core/vision.ts";
import { loadProject, loadSource } from "../src/node/load.ts";
import { cardLines, checkProject } from "../src/node/check.ts";
import { catalog, findEntry, libCard, libDraft, libList } from "../src/node/lib.ts";
import { encodePng } from "../src/node/png.ts";
import { failure } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

// what it reads: the library's art files and PNGs (pxl lib loads them all), and the examples' kept lines
const LIB = (readdirSync("lib", { recursive: true }) as string[]).filter((f) => /\.(px\.js|png)$/.test(f)).map((f) => `lib/${f.replaceAll("\\", "/")}`).sort();
const test = whenChanged("test/lib.test.ts", [...LIB, "test/examples.checks.txt"]);

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
  // a profile included twice (by a scene and by an entry that includes it) is defined once; twice by two lines, an error
  const dir = mkdtempSync(join(tmpdir(), "pxl-genre-"));
  writeFileSync(join(dir, "g.px.js"), `genre("g", { grid: 16 })\n`);
  writeFileSync(join(dir, "e.px.js"), `include("g.px.js")\nsprite("_e", { genre: "g" }, "1")\n`);
  writeFileSync(join(dir, "s.px.js"), `include("g.px.js")\ninclude("e.px.js", { as: "e" })\n`);
  assert.deepEqual([...loadProject(join(dir, "s.px.js")).genres.keys()], ["g"]);
  assert.match(failure(`genre("g", {})\ngenre("g", {})`).message, /t\.px\.js:2.*genre 'g' is already defined at/);
  const { genres } = catalog();
  assert.deepEqual(["hd2d", "topdown16", "racing_behind"].map((g) => genres.get(g)!.cell), ["hd2d/24ppm", "topdown/16", "behind/24ppm"]);
  assert.deepEqual([genres.get("topdown16")!.g.pitch, genres.get("topdown16")!.g.stand, genres.get("hd2d")!.g.mix], [45, 30, true]);
  assert.match(libList({ cell: "hd2d/17ppm" }).join("\n"), /crates\._crate_face +sprite +hd2d\/17ppm ✓/);
});

test("pxl lib: the catalog by subject, filters by cell and genre", () => {
  const all = libList();
  assert.match(all[0], /^pxl's library \(lib\/\), by subject/);
  assert.ok(all.some((l) => /^props +lib\/props: crates lamps side side_village village village32$/.test(l)));
  assert.throws(() => libList({ cell: "side/x" }), /--cell is <camera>\/<density>/);
  assert.throws(() => libList({ genre: "racing-behind" }), /no genre 'racing-behind' in lib\/profiles/);
  assert.throws(() => findEntry("nothing.here"), /no entry 'nothing\.here' in the library/);
  // a name its entry's last part (pxl lib car: make3d.car); when none or several, the near names
  assert.equal(findEntry("car").name, "make3d.car");
  assert.throws(() => findEntry("cars"), /no entry 'cars' in the library \(near: make3d\.car\)/);
  assert.throws(() => findEntry("lamp"), /no entry 'lamp' in the library \(near: make3d\.lamp, lamps\._lamp, /);
});

test("pxl lib <entry>: a card with what a build of it reads; --genre hd2d lists its cell", () => {
  const lamp = libCard("lamps._lamp").join("\n"), oak = libCard("make3d.oak").join("\n"), tr = libCard("traveler.tr").join("\n");
  assert.ok(lamp.includes(`take      include("${resolve("lib/props/lamps.px.js").split(sep).join("/")}", { as: "lamps" })  // its whole path`), lamp);
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

test("pxl lib <entry>: its take an include of the file's whole path, right in an art file in any folder (it was relative to where pxl ran)", () => {
  const was = process.cwd(), dir = mkdtempSync(join(tmpdir(), "pxl-take-"));
  try {
    process.chdir(dir);
    const m = /take +(include\("([^"]+)", \{ as: "car", palette: true \}\))/.exec(libCard("car").join("\n"))!;
    assert.ok(m && isAbsolute(m[2]) && !m[2].includes("\\") && existsSync(m[2]) && resolve(m[2]) === resolve(was, "lib/vehicles/car.px.js"), m?.[0]);
    // pasted into a file in another folder, it builds the car there
    writeFileSync(join(dir, "race.px.js"), `${m[1]}\nsprite("mine", { base: "car.car_fuego_ne" })\n`);
    assert.equal(loadProject(join(dir, "race.px.js")).image("mine").w, loadProject(m[2]).image("car_fuego_ne").w);
  } finally { process.chdir(was); }
});

test("pxl lib draft: a builder at a cell it lacks, written and built; a 2D entry refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-draft-"));
  const said = libDraft("make3d.chozubachi", { cell: "side/16" }, dir).join("\n");
  assert.match(said, /make3d\.chozubachi at side\/16: 0\.75 tiles tall \(its card's\) on a 16 px grid: 12 px tall; drawn 1[12] tall/);
  const art = readFileSync(join(dir, "chozubachi_side16.px.js"), "utf8");
  assert.match(art, /turnaround\("chozubachi_side16", make3d\.chozubachi\(\), \{ \.\.\.card\("make3d\.chozubachi"\)\.draw, view: \{ kind: "side", pitch: 0 \}/);
  assert.ok(existsSync(join(dir, "sprites", "chozubachi_side16_s.png")));
  assert.throws(() => libDraft("lamps._lamp", { cell: "side/16" }, dir), /drawn in 2D: at a new density it is redrawn simpler/);
  // by a genre: its camera, what stands at its stand pitch (topdown16's figures from 45, the rest from 30), fitted to the
  // card's box (neither side over: seen from above, both), its tones; its line topdown16's ink for the rest, "selout":
  // each material lined in its own darkest (surface's ink true)
  const rock = libDraft("make3d.rock", { genre: "topdown16" }, dir).join("\n"), m = /drawn (\d+) tall, (\d+) wide/.exec(rock)!;
  assert.match(rock, /seen from 30 degrees \(what stands; the ground's 45\), in 3 tones, each material lined in its own darkest \(its ink "selout"\)\n/);
  assert.ok(+m[1] <= 32 && +m[2] <= 32 && Math.max(+m[1], +m[2]) >= 31, rock);
  assert.match(readFileSync(join(dir, "rock_topdown16.px.js"), "utf8"), /genre\("topdown16", \{ camera: \{ kind: "topdown", pitch: 45 \}, pitch: 45, stand: 30, grid: 16, tones: 3, ink: \{ character: "#1a1620", rest: "selout".*\}\)\nturnaround\("rock_topdown16", make3d\.rock\(\), \{ \.\.\.card\("make3d\.rock"\)\.draw, surface: \{ \.\.\.card\("make3d\.rock"\)\.draw\?\.surface, ink: true \}, view: \{ kind: "side", pitch: 30 \}/);
  assert.throws(() => libDraft("make3d.rock", { genre: "racing_behind" }, dir), /its camera is behind; lib draft draws side, topdown, iso, hd2d/);
  // hd2d: a billboard from its figure's 20 degrees, fitted to the genre's box for the card's category (a bush 0.5 m
  // tall, 0.8 across: 12 x 19 px at 24 px a meter), not at the builder's own height
  const bush = libDraft("make3d.bush", { genre: "hd2d" }, dir).join("\n"), o = /drawn (\d+) tall, (\d+) wide/.exec(bush)!;
  assert.match(bush, /a box 0\.5 m tall, 0\.8 wide \(hd2d's bush\) at 24 px a meter: 12 px tall, 19 wide; .* \(drawn 0\.\d m at 24\), seen from 20 degrees as a billboard/);
  assert.ok(+o[1] <= 12 && +o[2] <= 19 && (+o[1] >= 12 || +o[2] >= 18), bush);
  assert.match(readFileSync(join(dir, "bush_hd2d.px.js"), "utf8"), /view: \{ kind: "side", pitch: 20 \}/);
});

test("make3d.cottage (lib/architecture/houses): params in their ranges, parts and sockets; drafted in topdown16's house box, its door two tiles tall", () => {
  const p = loadProject("lib/architecture/houses.px.js"), make = (s: string) => p.scope!(`make3d.cottage(${s})`) as { parts: object; sockets: Record<string, number[]> };
  const two = make(`{ width: 6, storeys: 2, chimney: "left" }`);
  assert.deepEqual([Object.keys(two.parts), Object.keys(two.sockets)], [["walls", "timber", "door", "windows", "roof", "stone"], ["door", "top", "chimney"]]);
  assert.ok(two.sockets.chimney[0] < 0 && two.sockets.top[2] > 2 * 2.7, JSON.stringify(two.sockets));
  assert.deepEqual(Object.keys(make(`{ windows: 0, chimney: "none" }`).sockets), ["door", "top"]);
  assert.throws(() => make(`{ pitch: 80 }`), /pitch is 20 to 60, got 80/);
  assert.throws(() => make(`{ chimney: "back" }`), /chimney is "right", "left", "none"/);
  // the door 2.3 m tall seen from 30 degrees: two 16 px tiles at the px a meter the house box gives it
  const said = libDraft("make3d.cottage", { genre: "topdown16" }, mkdtempSync(join(tmpdir(), "pxl-cottage-"))).join("\n"), m = /drawn (\d+) tall, (\d+) wide, its [\d.]+ m at ([\d.]+) px\/m/.exec(said)!;
  assert.ok(+m[1] <= 72 && +m[2] <= 80 && Math.abs(2.3 * Math.cos(Math.PI / 6) * +m[3] - 32) <= 2, said);
});

// an image's edge against the clear: its pixels' colors (a sprite's outline, or what stands in for one)
const edge = (im: Img) => im.data.filter((c, i) => c >>> 24 && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([u, v]) => { const x = (i % im.w) + u, y = Math.floor(i / im.w) + v; return x < 0 || y < 0 || x >= im.w || y >= im.h || !(im.data[y * im.w + x] >>> 24); }));
// near-black as pxl study reads an edge: dark and nearly grey
const black = (c: number) => { const k = lch(c); return k.L < 0.3 && k.C < 0.08; };

test("pxl lib draft make3d.oak --genre platformer16: side on its height fills the tree's box, its width its own; lined by the genre's ink for the rest (selout: each material its own darkest); its clusters a tile", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-draft16-"));
  const said = libDraft("make3d.oak", { genre: "platformer16" }, dir).join("\n"), m = /drawn (\d+) tall, (\d+) wide/.exec(said)!;
  // (it stood 33 px in the 64 px box, fitted to the box's 48 px width)
  assert.ok(+m[1] >= 61 && +m[1] <= 64 && +m[2] > 48, said);
  assert.match(said, /\(side on, its height fills the box; its own width\).* clusters a tile across \(\{ cluster: 16 \}\), in 3 tones, each material lined in its own darkest \(its ink "selout"\)/);
  assert.match(readFileSync(join(dir, "oak_platformer16.px.js"), "utf8"), /turnaround\("oak_platformer16", make3d\.oak\(\{ cluster: 16 \}\), \{ \.\.\.card\("make3d\.oak"\)\.draw, surface: \{ \.\.\.card\("make3d\.oak"\)\.draw\?\.surface, ink: true \}/);
  // its edge the leaves' and the bark's darkest (lib/nature/trees.px.js's oak_summer and bark), nothing lighter
  const im = loadProject(join(dir, "oak_platformer16.px.js")).image("oak_platformer16_s");
  assert.deepEqual([...new Set(edge(im))].sort(), [pack(0x14, 0x2a, 0x1a), pack(0x23, 0x1a, 0x20)].sort());
});

test("make3d.car (lib/vehicles/car): parts, sockets, its decal; 32 rotations a livery from 58, each on its footprint's middle, its line near-black all round; car.facing", () => {
  const p = loadProject("lib/vehicles/car.px.js"), make = (s: string) => p.scope!(`make3d.car(${s})`) as { parts: object; sockets: object; decals: object };
  assert.deepEqual([Object.keys(make("{}").parts), Object.keys(make("{}").sockets)], [["body", "wheels", "lights", "wing"], ["exhaust", "tow"]]);
  assert.deepEqual([Object.keys(make(`{ spoiler: 0, number: "none" }`).parts), Object.keys(make(`{ number: "none" }`).decals)], [["body", "wheels", "lights"], []]);
  assert.throws(() => make(`{ number: "num9" }`), /number is "num7", "num7_laguna", "roundel", "roundel_laguna", "none"/);
  for (const liv of ["fuego", "laguna"]) {
    const names = p.groups.get(`car_${liv}`)!.members;
    assert.equal(names.length, 32);
    assert.deepEqual([names[0], names[1], names[2], names[8]], [`car_${liv}_n`, `car_${liv}_11`, `car_${liv}_nne`, `car_${liv}_e`]);
    for (const n of names) {
      const im = p.image(n), [x, y, w, h] = im.boxes!.footprint[0];
      assert.ok(Math.abs(x + w / 2 - im.pivot![0]) <= 0.5 && Math.abs(y + h / 2 - im.pivot![1]) <= 0.5, `${n}: ${[x, y, w, h]} pivot ${im.pivot}`);
      assert.ok(edge(im).every(black), `${n}: the genre's ink all round, a character's`);
    }
  }
  // a route's heading on the picture (up it is n) to the rotation facing it, the nearest of 32
  assert.deepEqual(["[0, -1]", "[1, 0]", "[-1, 0.9]", "[0.1, 1]", "[1, -0.2]"].map((h) => p.scope!(`car.facing("laguna", ${h})`)), ["car_laguna_n", "car_laguna_e", "car_laguna_sw", "car_laguna_169", "car_laguna_79"]);
  // its camera, scale, light and line (car.TD) and the model's settings for them (car.TOP): another number of turns, the same car
  const f = join(mkdtempSync(join(tmpdir(), "pxl-")), "t.px.js");
  writeFileSync(f, `include(${JSON.stringify(join(import.meta.dirname, "../lib/vehicles/car.px.js"))}, { as: "car", palette: true })
turnaround("racer", make3d.car({ ...car.SPEC.laguna, ...car.TOP, number: "roundel_laguna" }), { ...car.TD, n: 16, mats: car.LIVERY.laguna })`);
  const q = loadProject(f);
  assert.equal(q.groups.get("racer")!.members.length, 16);
  assert.equal(q.image("racer_ne").hash(), p.image("car_laguna_ne").hash());
});

test("make3d.kart (lib/vehicles/kart): parts, sockets; the hero seated, 48 headings a livery, the east half the west's mirrors; kart.facing", () => {
  const p = loadProject("lib/vehicles/kart.px.js"), make = (s: string) => p.scope!(`make3d.kart(${s})`) as { parts: object; sockets: object };
  assert.deepEqual([Object.keys(make("{}").parts), Object.keys(make("{}").sockets)], [["body", "seat", "engine", "wheels", "steer"], ["seat", "wheel", "pedals", "exhaust"]]);
  assert.throws(() => make("{ width: 3 }"), /width/);
  for (const liv of ["fuego", "laguna"]) {
    const names = p.groups.get(`kart_${liv}`)!.members;
    assert.equal(names.length, 48);
    assert.deepEqual([names[0], names[1], names[3], names[12], names[24]], [`kart_${liv}_n`, `kart_${liv}_8`, `kart_${liv}_nne`, `kart_${liv}_e`, `kart_${liv}_s`]);
  }
  // seen from behind at racing_behind's 24 px a meter: Super Circuit's 32 across with its line, its tyres 3 rows under its
  // pivot (drawn 3 times over and shrunk, its line on its edge's own pixels: drawn at 1x it hung a row lower, outside)
  const back = p.image("kart_fuego_n"), b = back.bounds()!;
  assert.deepEqual([b.w, b.y + b.h - 1 - back.pivot![1]], [32, 3]);
  // painted: the head the hero's views (16, the east the west's mirror), steering 3 steps each way from behind, each with
  // the footprint the shrink doesn't carry
  assert.equal(p.groups.get("_hd_kart")!.members.length, 16);
  for (const n of ["kart_fuego_n", "kart_fuego_left3", "kart_laguna_right2"]) assert.ok(p.image(n).boxes?.footprint?.length, `${n}: its footprint`);
  // the east drawn as the west's mirror (Super Circuit's 23 flipped): their drawings, cut to their bounds, row for row reversed
  const cut = (n: string) => { const im = p.image(n), b = im.bounds()!; return [...Array(b.h).keys()].map((y) => [...Array(b.w).keys()].map((x) => im.data[(b.y + y) * im.w + b.x + x])); };
  const e = cut("kart_fuego_e"), w = cut("kart_fuego_w");
  assert.deepEqual(e, w.map((r) => [...r].reverse()), "e is w flipped");
  // a heading against the camera (0: driving away, clockwise) to the nearest of 48
  assert.deepEqual(["0", "7", "90", "-90", "181"].map((d) => p.scope!(`kart.facing("laguna", ${d})`)), ["kart_laguna_n", "kart_laguna_8", "kart_laguna_e", "kart_laguna_w", "kart_laguna_s"]);
});

test("lib/architecture/track_behind and lib/nature/trackside_behind: racing_behind's floor at 8 px tiles, what stands by rungs for its distances, the backdrop wraps", () => {
  const p = loadProject("lib/nature/trackside_behind.px.js"), at = (n: string, x: number, y: number) => { const im = p.image(n); return im.data[y * im.w + x]; };
  // the floor's tiles 8 px; a road's edge (mask 3: the top half road) a line of 2 px across the tile's middle
  const road = p.image("circuit.road_3_0");
  assert.deepEqual([road.w, road.h, at("circuit.road_3_0", 2, 3) === at("circuit.road_3_0", 5, 3), at("circuit.road_3_0", 2, 3) !== at("circuit.road_3_0", 2, 4)], [8, 8, true, true]);
  // a rung for each doubling of the distance, half the size: a cone 12 px tall at 11 m, 6 at 22; rung() the nearest
  const tall = (n: string) => p.image(n).bounds()!.h;
  assert.ok(Math.abs(tall("circuit.cone_0") - 2 * tall("circuit.cone_1")) <= 2, "cone_0 twice cone_1");
  assert.deepEqual([11, 30, 50, 100, 400].map((z) => p.scope!(`circuit.rung("lamp", ${z})`)), ["circuit.lamp_0", "circuit.lamp_1", "circuit.lamp_2", "circuit.lamp_3", "circuit.lamp_3"]);
  assert.equal(p.scope!(`circuit.rung("cone", 50)`), "circuit.cone_1", "past its last rung (none under 4 px), its last");
  assert.deepEqual([11, 30].map((z) => p.scope!(`circuit.rung("gantry", ${z})`)), ["circuit.gantry_1", "circuit.gantry_1"]);
  // the backdrop's layers 256 across, each wrapping: its first column and its last continue (a ridge's top within a row)
  for (const n of ["hills", "treeline"]) {
    const im = p.image(n), topOf = (x: number) => [...Array(im.h).keys()].find((y) => im.data[y * im.w + x] >>> 24) ?? im.h;
    assert.equal(im.w, 256);
    assert.ok(Math.abs(topOf(0) - topOf(255)) <= 2, `${n} wraps`);
  }
});

test("kart.small (lib/vehicles/kart): kart.LADDER's two last rungs by hand, 8 headings a livery, the east the west's mirror, laguna by its roles", () => {
  const p = loadProject("lib/vehicles/kart.px.js");
  const cut = (n: string) => { const im = p.image(n), b = im.bounds()!; return [...Array(b.h).keys()].map((y) => [...Array(b.w).keys()].map((x) => im.data[(b.y + y) * im.w + b.x + x])); };
  for (const px of [9, 6]) {
    assert.equal(p.groups.get(`kart_laguna_${px}px`)!.members.length, 8);
    assert.equal(p.image(`kart_fuego_${px}px_n`).bounds()!.w, px, "its px across from behind");
    assert.deepEqual(cut(`kart_fuego_${px}px_e`), cut(`kart_fuego_${px}px_w`).map((r) => [...r].reverse()), "e is w flipped");
    assert.notDeepEqual(cut(`kart_laguna_${px}px_n`), cut(`kart_fuego_${px}px_n`), "laguna its own colors");
  }
  assert.deepEqual(["0", "44", "90", "-90", "225"].map((d) => p.scope!(`kart.small("laguna", 9).facing(${d})`)), ["kart_laguna_9px_n", "kart_laguna_9px_ne", "kart_laguna_9px_e", "kart_laguna_9px_w", "kart_laguna_9px_sw"]);
  assert.throws(() => p.scope!(`kart.small("fuego", 13)`), /9 or 6/);
  assert.equal(p.scope!(`kart.rival("_r", "laguna", 6).facing(180)`), "kart_laguna_6px_s", "kart.rival's two last rungs the hand ones");
});

test("lib/architecture/track: the kerb's blocks meet at every tile side (red leaving by the left or top, white by the right or bottom); a start line on any tile's asphalt; its 3D things at the car's scale, lined all round in their materials' line tones, none near-black", () => {
  const p = loadProject("lib/architecture/track.px.js"), RED = pack(0xe8, 0x41, 0x4b), WHITE = pack(0xee, 0xeb, 0xe0);
  for (const m of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
    const im = p.image(`kerb_${m}_0`), at = (x: number, y: number) => im.data[y * 16 + x];
    for (let i = 0; i < 16; i++) for (const [x, y, want] of [[0, i, RED], [i, 0, RED], [15, i, WHITE], [i, 15, WHITE]] as const) {
      const c = at(x, y);
      if (c === RED || c === WHITE) assert.equal(c, want, `kerb_${m}_0 at ${x},${y}`);
    }
  }
  const line = p.image("start_12").data, blank = p.image("track_12_0").data;
  assert.ok(line.some((c, i) => c !== blank[i]) && line.slice(0, 16 * 8).every((c, i) => c === blank[i]), "start_12: the checker on the lower half's asphalt only");
  // its things in 3D, in meters at the car's scale: four tyres along are 2.48 m; drawn at racing_topdown at twice the
  // car's scale (its boxes for the small things), the wall and the barrier are two 16 px tiles (their line a px
  // outside); a near-black line the cars' alone (racing_topdown's ink by kind): theirs all round, each part in its
  // material's line tones (its ramp's first two), the banner's black squares inside it
  const mats = p.scope!(`card("make3d.gantry").draw.mats`) as Record<string, string[]>, LINE = new Set(Object.values(mats).flatMap((r) => r.slice(0, 2)).map((h) => pack(...(h.match(/\w\w/g)!.map((x) => parseInt(x, 16)) as [number, number, number]))));
  assert.deepEqual(p.scope!("make3d.tyres({ along: 4 }).field.bounds()"), [[-1.24, -0.31, 0], [1.24, 0.31, 0.6]]);
  for (const n of ["tyre_wall", "barrier"]) {
    const im = p.image(n), xs = [...im.data.keys()].filter((i) => im.data[i] >>> 24).map((i) => i % im.w);
    assert.equal(Math.max(...xs) - Math.min(...xs) + 1, 32 + 2, `${n} drawn 32 px wide, its line a px outside each end`);
  }
  for (const n of ["tyres", "tyre_wall", "cone", "barrier", "lamp", "gantry"]) assert.ok(edge(p.image(n)).every((c) => LINE.has(c) && !black(c)), `${n}: lined all round, no near-black`);
});

test("lib/nature/trackside: the trees, bush and rock drawn by their 3D builders at racing_topdown, its pivot on its footprint, the bush in the kit's greens, each lined all round in its parts' own line tones, none near-black; the oak's trunk under its crown", () => {
  const p = loadProject("lib/nature/trackside.px.js"), leaves = new Set(["#123a2a", "#1b4d34", "#287a44", "#3f9a3c", "#97e04a"].map((h) => pack(...(h.match(/\w\w/g)!.map((x) => parseInt(x, 16)) as [number, number, number]))));
  // the leaves', the bark's, the needles' and the stone's two line tones
  const LINE = new Set(["#123a2a", "#1b4d34", "#4a2a22", "#57322a", "#103a36", "#16493f", "#36344a", "#3f3d55"].map((h) => pack(...(h.match(/\w\w/g)!.map((x) => parseInt(x, 16)) as [number, number, number]))));
  for (const n of ["oak", "spruce", "bush", "rock"]) {
    const im = p.image(n), [x, y, w, h] = im.boxes!.footprint[0];
    assert.ok(im.pivot![0] >= x && im.pivot![0] <= x + w && im.pivot![1] >= y && im.pivot![1] <= y + h, `${n}: ${[x, y, w, h]} pivot ${im.pivot}`);
    assert.ok(edge(im).every((c) => LINE.has(c) && !black(c)), `${n}: lined all round, no near-black`);
  }
  // from 58 the oak's trunk shows: bark in the rows under its lowest leaf, above its foot (the pivot)
  const oak = p.image("oak"), BARK = new Set(["#4a2a22", "#57322a", "#7a4630", "#a06a40", "#c98a55"].map((h) => pack(...(h.match(/\w\w/g)!.map((x) => parseInt(x, 16)) as [number, number, number]))));
  const rows = (keep: (c: number) => boolean) => [...oak.data.keys()].filter((i) => keep(oak.data[i])).map((i) => Math.floor(i / oak.w));
  assert.ok(Math.max(...rows((c) => BARK.has(c))) - Math.max(...rows((c) => !!(c >>> 24) && !BARK.has(c))) >= 3, "the oak's trunk 3 rows under its crown");
  assert.ok(p.image("bush").data.every((c) => !(c >>> 24) || leaves.has(c)), "the bush in the kit's greens");
});

test("lib/characters/hero: the old names at setting iii, its rig's joints; a character made from it, dress.px.js included again", () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-hero-")), lib = join(process.cwd(), "lib", "characters").replaceAll("\\", "/");
  writeFileSync(join(dir, "v.px.js"), `include("${lib}/hero.px.js", { as: "hero", palette: true })
include("${lib}/dress.px.js")
hero.character("v", { moves: ["idle"], swap: { n: "#7a2f3a" } })
`);
  const p = loadProject(join(dir, "v.px.js"));
  assert.ok(["idle", "walk", "run", "attack"].every((m) => ["down", "up", "side"].every((d) => p.assets.has(`hero.${m}_${d}`))));
  const v = p.image("v_idle_down"), hit = p.image("hero.attack_side");
  assert.deepEqual([v.w, v.h, v.pivot, hit.w, hit.h, hit.pivot], [18, 32, [8, 31], 32, 40, [16, 35]]);
  // his right hand on the walk's second frame facing s, in the 18 x 32 frame: where a 2D part goes
  const [x, y] = p.scope!(`hero.rig.screen(hero.rig.joints(hero.rig.pose("walk", 1, 180), 180).arms[1].hand)`) as number[];
  assert.ok(x > 0 && x < 18 && y > 14 && y < 28, `${x}, ${y}`);
});

test("lib/styles/hand32.px.js: a draft drawn 3 times over brought down (shrink), a lone step evened, an old line taken off its edge", () => {
  const lib = join(process.cwd(), "lib", "styles").replaceAll("\\", "/");
  const dir = mkdtempSync(join(tmpdir(), "pxl-hand32-"));
  writeFileSync(join(dir, "h.px.js"), `include("${lib}/hand32.px.js")
pal({ a: "#808080", b: "#ffffff", k: "#000000" })
ramps("kab")
sprite("_big", { w: 18, h: 18 }, (c) => { c.rect(3, 3, 12, 12, "b"); c.rect(4, 0, 1, 2, "b") })
sprite("small", { base: "_big", shrink: { by: 3, cover: 1 / 3 } }, (c) => { c.px(5, 2, "b"); even32(c); c.rect(3, 1, 1, 3, "a"); c.rect(4, 1, 1, 4, "k"); c.rect(1, 4, 4, 1, "k"); unline32(c, "k") })`);
  const p = loadProject(join(dir, "h.px.js"));
  const im = p.image("small"), at = (x: number, y: number) => im.data[y * 6 + x];
  // the 4 x 4 square kept (its 1 x 2 sliver under a third of a block: gone), the lone pixel out of its right side cut; its
  // old line (k, its right column and its bottom row) each the colour just inside it, at the corner the one diagonally in
  const [a, b] = [pack(128, 128, 128), pack(255, 255, 255)];
  assert.deepEqual([at(1, 0), at(5, 2), at(4, 1), at(2, 4), at(4, 4), at(1, 4)], [0, 0, a, b, a, b]);
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
  // clean on lib/: examples.test.ts runs pxl check (these card lines too) on every lib file against its kept lines, which say none
  assert.doesNotMatch(readFileSync("test/examples.checks.txt", "utf8"), /^lib\/.*\n(?: {2}.*\n)*? {2}.*its card's cell/m);
});
