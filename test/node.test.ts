import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { decodePng, encodePng } from "../src/node/png.ts";
import { encodeGif, medianCut } from "../src/node/gif.ts";
import { main } from "../src/node/cli.ts";
import { loadProject } from "../src/node/load.ts";
import { latticeHash } from "../src/core/util.ts";
import { writeOutputs, writePng } from "../src/node/output.ts";
import { serve } from "../src/node/server.ts";

function chunks(buf: Buffer): { type: string; data: Buffer; crcOk: boolean }[] {
  const out = [];
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    out.push({ type, data, crcOk: (crc32(buf.subarray(o + 4, o + 8 + len)) >>> 0) === buf.readUInt32BE(o + 8 + len) });
    o += 12 + len;
  }
  return out;
}

test("png: indexed with transparency, valid CRCs, inflatable", () => {
  const img = new Img(2, 2);
  img.set(0, 0, pack(255, 0, 0));
  img.set(1, 1, pack(0, 0, 255, 128));
  const c = chunks(encodePng(img));
  assert.deepEqual(c.map((x) => x.type), ["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
  assert.ok(c.every((x) => x.crcOk));
  assert.equal(inflateSync(c[3].data).length, 2 * 3);
});

test("png: RGBA when more than 256 colors", () => {
  const img = new Img(20, 20);
  for (let i = 0; i < 400; i++) img.data[i] = pack(i % 256, Math.floor(i / 256), 7);
  const c = chunks(encodePng(img));
  assert.equal(c[0].data[9], 6);
  assert.equal(inflateSync(c.find((x) => x.type === "IDAT")!.data).length, 20 * (20 * 4 + 1));
});

/** A PNG from raw (unfiltered) rows, each row filtered with `filter(row)`, as other encoders write them. */
function rawPng(w: number, h: number, type: number, depth: number, rows: number[][], filter: (y: number) => number, extra: [string, number[]][] = []): Buffer {
  const chunk = (t: string, d: Buffer) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(d.length); head.write(t, 4, "ascii");
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), d])) >>> 0);
    return Buffer.concat([head, d, crc]);
  };
  const bpp = Math.max(1, ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type] * depth >> 3);
  let prev = new Array(rows[0].length).fill(0);
  const body = rows.flatMap((row, y) => {
    const f = filter(y);
    const out = row.map((v, i) => {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      return (v - pred) & 255;
    });
    prev = row;
    return [f, ...out];
  });
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = depth; ihdr[9] = type;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    ...extra.map(([t, d]) => chunk(t, Buffer.from(d))), chunk("IDAT", deflateSync(Buffer.from(body))), chunk("IEND", Buffer.alloc(0))]);
}

test("png decode: round-trips the encoder (indexed + RGBA), all filters, gray / 16-bit / tRNS", () => {
  const small = new Img(3, 2);
  small.data.set([pack(255, 0, 0), 0, pack(0, 0, 255, 128), pack(1, 2, 3), pack(255, 0, 0), 0]);
  assert.deepEqual([...decodePng(encodePng(small)).data], [...small.data]);
  const big = new Img(20, 20);
  for (let i = 0; i < 400; i++) big.data[i] = pack(i % 256, Math.floor(i / 256), 7);
  assert.deepEqual([...decodePng(encodePng(big)).data], [...big.data]);
  // RGB 8-bit, 3x5, one row per filter type; tRNS makes (9, 9, 9) transparent.
  const rows = [0, 1, 2, 3, 4].map((y) => [10 * y, 200, 9, 30 + y, 40, 50, 9, 9, 9].map((v, i) => (i < 3 && y === 2 ? 9 : v)));
  const rgb = decodePng(rawPng(3, 5, 2, 8, rows, (y) => y, [["tRNS", [0, 9, 0, 9, 0, 9]]]));
  assert.equal(rgb.data[0], pack(0, 200, 9));
  assert.equal(rgb.data[3 * 3 + 1], pack(33, 40, 50));
  assert.equal(rgb.data[2 * 3], 0, "the tRNS color is transparent");
  assert.equal(rgb.data[4 * 3 + 2], 0);
  // 2-bit gray: 0..3 -> 0, 85, 170, 255
  assert.deepEqual([...decodePng(rawPng(4, 1, 0, 2, [[0b00011011]], () => 0)).data], [0, 85, 170, 255].map((v) => pack(v, v, v)));
  // 16-bit RGBA keeps the high bytes
  assert.equal(decodePng(rawPng(1, 1, 6, 16, [[0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xff, 0xff]], () => 4)).data[0], pack(0x12, 0x56, 0x9a));
  // indexed 4-bit with a palette
  assert.deepEqual([...decodePng(rawPng(2, 1, 3, 4, [[0x10]], () => 0, [["PLTE", [1, 2, 3, 4, 5, 6]]])).data], [pack(4, 5, 6), pack(1, 2, 3)]);
  assert.throws(() => decodePng(Buffer.from("nope, not a png")), /not a PNG/);
});

test("png assets: { png, area }, strip anims, palettize, use(\"x.png\"), errors", () => {
  const { dir, file } = tmpArt(`pal({ R: "#ff0000", B: "#0000ff" })
sprite("whole", { png: "sheet.png", outline: "0" })
sprite("part", { png: "sheet.png", area: [2, 0, 2, 1] })
anim("strip", { png: "sheet.png", frames: 2, fps: 10 })
sprite("snap", { png: "near.png", palettize: true })`);
  const sheet = new Img(4, 1);
  sheet.data.set([pack(255, 0, 0), pack(0, 255, 0), pack(0, 0, 255), 0]);
  writeFileSync(join(dir, "sheet.png"), encodePng(sheet));
  const near = new Img(2, 1);
  near.data.set([pack(250, 10, 5), pack(20, 0, 230)]);
  writeFileSync(join(dir, "near.png"), encodePng(near));
  const p = loadProject(file);
  assert.equal(p.image("whole").w, 6, "asset options apply (outline grows it)");
  assert.deepEqual([...p.image("part").data], [pack(0, 0, 255), 0]);
  assert.deepEqual(p.frames("strip").map((f) => [...f.img.data]), [[pack(255, 0, 0), pack(0, 255, 0)], [pack(0, 0, 255), 0]]);
  assert.deepEqual([...p.image("snap").data], [pack(255, 0, 0), pack(0, 0, 255)]);
  assert.ok(p.files.some((f) => f.endsWith("sheet.png")), "watched for live rebuilds");

  // use("x.png"): the image's colors, keyed in order of first appearance
  const u = tmpArt(`use("sheet.png")\nsprite("t", "210")`);
  writeFileSync(join(u.dir, "sheet.png"), encodePng(sheet));
  assert.deepEqual([...loadProject(u.file).image("t").data], [pack(0, 0, 255), pack(0, 255, 0), pack(255, 0, 0)]);

  const bad = (src: string, re: RegExp) => { const t = tmpArt(src); writeFileSync(join(t.dir, "s.png"), encodePng(sheet)); assert.throws(() => loadProject(t.file), re); };
  bad(`sprite("a", { png: "s.png", area: [3, 0, 2, 1] })`, /area must be \[x, y, w, h\] inside the 4x1 image/);
  bad(`sprite("a", { png: "missing.png" })`, /cannot read .*missing\.png/);
  bad(`sprite("b", "r"); sprite("a", { png: "s.png", base: "b" })`, /png and base both set the starting image/);
});

test("png shrink, pose from a JSON file, reference layers in previews only", () => {
  const { dir, file } = tmpArt(`pal({ R: "#ff0000", B: "#0000ff", k: "#000000", w: "#ffffff" })
sprite("small", { png: "big.png", shrink: 2 })
sprite("posed", { w: 4, h: 2 }, pose("pose.json", { scale: 0.5, color: "R", joint: "w", bones: [["a", "b"]] }))
sprite("guided", { w: 2, h: 1 }, "R", layer("guide", { ref: true }, ".B"))`);
  const big = new Img(4, 2);
  big.data.set([pack(255, 0, 0), pack(255, 0, 0), pack(0, 0, 255), 0, pack(255, 0, 0), pack(0, 0, 255), 0, 0]);
  writeFileSync(join(dir, "big.png"), encodePng(big));
  writeFileSync(join(dir, "pose.json"), JSON.stringify({ a: [0, 2, 0.9], b: [6, 2, 0.8] }));
  const p = loadProject(file);
  assert.deepEqual([...p.image("small").data], [pack(255, 0, 0), 0], "majority per 2x2 block; a quarter-filled block is empty");
  writeFileSync(join(dir, "same.px.js"), `sprite("same", { png: "big.png", shrink: 1 })`);
  assert.equal(loadProject(join(dir, "same.px.js")).image("same").w, 4, "shrink 1: as it is");
  assert.deepEqual([...p.image("posed").data].slice(4, 8), [pack(255, 255, 255), pack(255, 0, 0), pack(255, 0, 0), pack(255, 255, 255)]);
  assert.ok(p.files.some((f) => f.endsWith("pose.json")), "watched for live rebuilds");
  assert.deepEqual([...p.image("guided").data], [pack(255, 0, 0), 0], "the art leaves the reference layer out");
  const out = join(dir, "out");
  writeOutputs(p, out, { only: ["guided"], scale: 1 });
  assert.deepEqual([...decodePng(readFileSync(join(out, "sprites", "guided.png"))).data], [pack(255, 0, 0), 0]);
  assert.equal(decodePng(readFileSync(join(out, "_preview", "guided.png"))).data[1], pack(0, 0, 255), "the preview shows it");

  const bad = (src: string, re: RegExp) => { const t = tmpArt(src); writeFileSync(join(t.dir, "big.png"), encodePng(big)); assert.throws(() => loadProject(t.file), re); };
  bad(`sprite("a", { png: "big.png", shrink: 3 })`, /shrink must be a whole factor from 1 \(as it is\) to 2/);
  bad(`sprite("a", pose("missing.json"))`, /cannot read .*missing\.json/);
});

test("cli compare: the asset's rows against a reference PNG, shrunk and offset", async () => {
  const { dir, file } = tmpArt(`pal({ R: "#ff0000" })\nsprite("t", { w: 4, h: 1 }, "RRRR")`);
  const ref = new Img(4, 2);
  ref.data.set([0, pack(9, 9, 9), pack(9, 9, 9), 0, 0, pack(9, 9, 9), pack(9, 9, 9), 0]);
  writeFileSync(join(dir, "ref.png"), encodePng(ref));
  const lines: string[] = [], log = console.log;
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["compare", file, "t", join(dir, "ref.png"), "--shrink", "2", "--offset", "1,0"]), 0); } finally { console.log = log; }
  const text = lines.join("\n");
  assert.match(text, /^ {2}0 {2}1-2 +0-3 +\+1 +\+1$/m);
  assert.match(text, /wider on 1/);
});

function tmpArt(src: string): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), "pxl-"));
  const file = join(dir, "a.px.js");
  writeFileSync(file, src);
  return { dir, file };
}

test("cli build --profile names the slow function in the art file and the slowest asset", async () => {
  const { file } = tmpArt(`use("pico8")
function slow(n) { let s = 0; for (let i = 0; i < n; i++) s += Math.sin(i) * Math.cos(i); return s }
sprite("busy", { w: 4, h: 4 }, (c) => { if (slow(4e6) > -1e9) c.rect(0, 0, 4, 4, "8") })
sprite("quick", "7")`);
  const log = console.log;
  const lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["build", file, "--profile", "--no-preview"]), 0); } finally { console.log = log; }
  const out = lines.join("\n");
  assert.match(out, /profile: .* in all; slowest assets: busy/);
  assert.match(out, /slow +a\.px\.js:2/);
});

test("cli build writes sprites, previews, layered exports and sheets", async () => {
  const { dir, file } = tmpArt(`use("pico8")
sprite("dot", { outline: "0" }, "8")
sprite("lay", { w: 2, h: 1, layers: true }, layer("a", px(0, 0, "7")), layer("b", px(1, 0, "8")))
sprite("_part", "7")
sheet("all", ["*"], { pad: 1 })`);
  const log = console.log;
  const lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["build", file]), 0); } finally { console.log = log; }
  for (const p of ["sprites/dot.png", "sprites/lay.png", "sprites/lay/a.png", "sprites/lay/b.png", "_preview/dot.png", "all.png", "all.json"])
    assert.ok(existsSync(join(dir, "out", p)), p);
  assert.ok(!existsSync(join(dir, "out", "sprites", "_part.png")));
  const json = JSON.parse(readFileSync(join(dir, "out", "all.json"), "utf8"));
  assert.deepEqual(Object.keys(json.frames), ["dot", "lay"]);
  assert.deepEqual(json.frames.dot.frame, { x: 0, y: 0, w: 3, h: 3 });
  assert.ok(lines.some((l) => l.startsWith("sprite dot 3x3")));
});

test("include keeps each file's palette to itself", () => {
  const { dir, file } = tmpArt(`pal({ q: "#00ff00" })\ninclude("lib.px.js")\nsprite("b", "q")\nsprite("c", "z")`);
  writeFileSync(join(dir, "lib.px.js"), `use("sweetie16")\npal({ z: "#ff0000" })\nsprite("a", "z")`);
  const p = loadProject(file);
  assert.equal(p.image("a").data[0], pack(255, 0, 0));
  assert.equal(p.image("b").data[0], pack(0, 255, 0));
  assert.throws(() => p.image("c"), /unknown color key 'z'/);
});

test("use() reads palette files next to the art file: .hex, .gpl, .pal, .txt", () => {
  const files: Record<string, string> = {
    "a.hex": "ff0000\n00ff00\n",
    "a.gpl": "GIMP Palette\nName: t\nColumns: 2\n#\n255   0   0\tred\n  0 255   0\tgreen\n",
    "a.pal": "JASC-PAL\n0100\n2\n255 0 0\n0 255 0\n",
    "a.txt": "; paint.net\nFFFF0000\nFF00FF00\n",
  };
  for (const [name, text] of Object.entries(files)) {
    const { dir, file } = tmpArt(`use("${name}")\nsprite("t", "01")`);
    writeFileSync(join(dir, name), text);
    const p = loadProject(file);
    assert.deepEqual([...p.image("t").data], [pack(255, 0, 0), pack(0, 255, 0)], name);
    assert.ok(p.files.some((f) => f.endsWith(name)), "watched for live rebuilds");
  }
  const { file } = tmpArt(`use("missing.hex")`);
  assert.throws(() => loadProject(file), /cannot read .*missing\.hex/);
});

test("palette files name keys next to their colors: '1a1626 k ink', .gpl names", () => {
  const cases: Record<string, string> = {
    "k.hex": "ff0000 r  red, the rest is a comment\n00ff00\n0000ff b\n",
    "k.gpl": "GIMP Palette\nName: t\n255 0 0\tr\n0 255 0\tGreen\n0 0 255\tb\n",
  };
  for (const [name, text] of Object.entries(cases)) {
    const { dir, file } = tmpArt(`use("${name}")\npal({ g: 1 })\nsprite("t", "rgb")`);
    writeFileSync(join(dir, name), text);
    const p = loadProject(file);
    assert.deepEqual([...p.image("t").data], [pack(255, 0, 0), pack(0, 255, 0), pack(0, 0, 255)], name);
    assert.deepEqual([...p.assets.get("t")!.pal.keys.keys()].sort(), ["b", "g", "r"], "named files have only the named keys (+ pal)");
  }
  const { dir, file } = tmpArt(`use("d.hex")`);
  writeFileSync(join(dir, "d.hex"), "ff0000 r\n00ff00 r\n");
  assert.throws(() => loadProject(file), /d\.hex line 2: key 'r' is already used/);
});

test("include: a top-level name declared in two files says that included files share one scope", () => {
  const { dir, file } = tmpArt(`const SIZE = 1\ninclude("lib.px.js")`);
  writeFileSync(join(dir, "lib.px.js"), `const SIZE = 2`);
  assert.throws(() => loadProject(file), /lib\.px\.js: Identifier 'SIZE' has already been declared\. Included files share one scope/);
});

test("include { palette: true } shares the included palette", () => {
  const { dir, file } = tmpArt(`include("pal.px.js", { palette: true })\nsprite("b", "z")`);
  writeFileSync(join(dir, "pal.px.js"), `pal({ z: "#ff0000" })`);
  assert.equal(loadProject(file).image("b").data[0], pack(255, 0, 0));
});

test("cli steps: the painting log, --at follows one pixel, --sheet writes thumbnails", async () => {
  const { dir, file } = tmpArt(`use("pico8")\nsprite("t", { w: 3, h: 1, outline: "0" },\n  rect(0, 0, 3, 1, "8"), px(1, 0, "7"), px(9, 9, "7"))`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try {
    assert.equal(await main(["steps", file, "t", "--sheet"]), 0);
    assert.equal(await main(["steps", file, "t", "--at", "2,1"]), 0);
  } finally { console.log = log; }
  const out = lines.join("\n");
  assert.match(out, /t: 4 steps \(sprite 5x3\)/);
  assert.match(out, /1  rect\(0, 0, 3, 1, "8"\).*a\.px\.js:3:3 +3px at 0,0 3x1 \(canvas 3x1\)/);
  assert.match(out, /3  px\(9, 9, "7"\).*no change/, "an op that paints nothing says so");
  assert.match(out, /4  outline 0.*canvas resized to 5x3/);
  // final (2, 1) is (1, 0) before the outline: painted 8, then 7
  const at = lines.slice(lines.findIndex((l) => l.startsWith("t pixel (2, 1)")) + 1);
  assert.deepEqual(at.map((l) => l.trim().split(/\s+/)[0] + " " + l.trim().split(" ").pop()), ["1 8", "2 7"]);
  assert.ok(existsSync(join(dir, "out", "_preview", "t_steps.png")));
});

test("tilemaps export to Tiled: redrawing the .tmj the way Tiled does gives back the layer", () => {
  // 2x2 cells of 2x2; the "t" tile is 2x3, taller than its cell (Tiled bottom-aligns it).
  const { dir, file } = tmpArt(`use("pico8")
sprite("a", { w: 2, h: 2 }, rect(0, 0, 2, 2, "8"))
sprite("b", { w: 2, h: 2 }, rect(0, 0, 2, 2, "b"), px(0, 0, "7"))
sprite("t", { w: 2, h: 3 }, rect(0, 0, 2, 3, "c"))
scene("s", { w: 8, h: 8, layers: true }, layer("ground", tilemap("ab\\nba", { size: 2, x: 1, y: 1, map: { a: "a", b: "b" } })),
  layer("tall", tilemap("t.\\n.t", { w: 2, h: 2, x: 4, y: 2, map: { t: "t" } })))`);
  const p = loadProject(file);
  writeOutputs(p, join(dir, "out"), { preview: false });
  const tmj = JSON.parse(readFileSync(join(dir, "out", "scenes", "s.tmj"), "utf8"));
  assert.equal(tmj.orientation, "orthogonal");
  assert.deepEqual(tmj.layers.map((l: { name: string }) => l.name), ["ground", "tall"]);
  assert.equal(tmj.tilesets[0].tilecount, 2, "a and b, each once");
  for (const [li, layer] of tmj.layers.entries()) {
    const ts = [...tmj.tilesets].reverse().find((t: { firstgid: number }) => t.firstgid <= Math.max(...layer.data));
    const sheet = decodePng(readFileSync(join(dir, "out", "scenes", ts.image)));
    const redrawn = new Img(8, 8);
    layer.data.forEach((gid: number, k: number) => {
      if (!gid) return;
      const id = gid - ts.firstgid, sx = (id % ts.columns) * ts.tilewidth, sy = Math.floor(id / ts.columns) * ts.tileheight;
      // Tiled: tile bottom on the cell bottom, then the tileset's tileoffset.
      const x = layer.offsetx + (k % layer.width) * tmj.tilewidth + (ts.tileoffset?.x ?? 0);
      const y = layer.offsety + (Math.floor(k / layer.width) + 1) * tmj.tileheight - ts.tileheight + (ts.tileoffset?.y ?? 0);
      for (let yy = 0; yy < ts.tileheight; yy++) for (let xx = 0; xx < ts.tilewidth; xx++) redrawn.set(x + xx, y + yy, sheet.get(sx + xx, sy + yy));
    });
    const drawn = decodePng(readFileSync(join(dir, "out", "scenes", "s", ["ground", "tall"][li] + ".png")));
    assert.deepEqual([...redrawn.data], [...drawn.data], `layer ${layer.name}`);
  }
});

const said = async (...argv: string[]) => {
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { await main(argv); } finally { console.log = log; }
  return lines.join("\n");
};

test("cli build of a whole file counts what it wrote; --list (or --only) gives a line each", async () => {
  const { file } = tmpArt(`use("pico8")\nfor (let i = 0; i < 13; i++) sprite("d" + i, "8")`);
  assert.match(await said("build", file), /^13 written: 13 sprites \(--list: one line each\)$/m);
  assert.match(await said("build", file, "--list"), /^sprite d12 1x1 @16x$/m);
  assert.match(await said("build", file, "--only", "d3"), /^sprite d3 1x1 @16x$/m);
});

test("cli shot: one call per look: the picture, what changed since the last shot, check's warnings", async () => {
  // a figure whose pivot is 3 px under its sole: it floats, and the shot says so
  const { dir, file } = tmpArt(`use("pico8")
sprite("man", { w: 3, h: 12, height: 1.8, pivot: [1.5, 12] }, rect(0, 0, 3, 9, "8"))
scene("s", { w: 30, h: 30, bg: "1", world: { scale: 5, ground: 26 } }, stamp("man", 10, 26))`);
  const first = await said("shot", file, "s");
  assert.ok(existsSync(join(dir, "out", "_shot", "s.png")));
  assert.doesNotMatch(first, /since the last shot/);
  assert.match(first, /^s › man @-, feet 11,22 › WARNING: its feet are 3 px above where it stands/m);
  assert.match(first, /^2 warnings; ran: feet on 1/m);
  // moved 2 px right: what changed is the old place and the new one; the same shot again: nothing
  writeFileSync(file, readFileSync(file, "utf8").replace('stamp("man", 10, 26)', 'stamp("man", 12, 26)'));
  assert.match(await said("shot", file, "s"), /^since the last shot: 36 px changed in 9,14 5x9$/m);
  assert.match(await said("shot", file, "s"), /^since the last shot: no change$/m);
  // another region is another shot: not compared
  assert.doesNotMatch(await said("shot", file, "s", "--at", "0,0,10,10"), /since the last shot/);
});

test("cli shot of several assets, one from another file: a row each, top down, and each one's warnings", async () => {
  const { dir, file } = tmpArt(`use("pico8")\nsprite("a", { w: 3, h: 2 }, rect(0, 0, 3, 2, "8"))`);
  const other = join(dir, "b.px.js");
  writeFileSync(other, `use("pico8")\nsprite("b", { w: 3, h: 2 }, rect(0, 0, 3, 2, "c"))`);
  const text = await said("shot", file, "a", `${other}:b`, "--scale", "1");
  assert.match(text, /rows, top down: a, .*b\.px\.js:b; 1x\)/);
  const png = decodePng(readFileSync(join(dir, "out", "_shot", "a+b.png")));
  assert.deepEqual([png.w, png.h], [3, 2 + 2 + 2], "two rows of 2 with a 2 px gap");
  assert.notEqual(png.data[0], png.data[4 * 3], "the second row is the other file's sprite");
  await assert.rejects(main(["shot", file, "a", `${other}:b`, "--vs", "HEAD"]).then((c) => { if (c) throw new Error("refused"); }), /refused/);
});

test("cli shot --vs a revision reads what the file includes as it was there too", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js"), part = join(dir, "part.px.js");
  writeFileSync(file, `use("pico8")
include("part.px.js")
sprite("a", { w: 2, h: 2 }, rect(0, 0, 2, 2, KEY))`);
  writeFileSync(part, `const KEY = "8"`);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q"); git("add", "."); git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "a");
  writeFileSync(part, `const KEY = "c"`);
  assert.match(await said("shot", file, "a", "--vs", "HEAD", "--diff"), /^4 px changed$/m);
});

test("cli shot of PNGs from anywhere, several regions: a row per image, a column per region", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), a = join(dir, "a.png"), b = join(dir, "b.png");
  const img = (c: number) => { const i = new Img(8, 6); i.fill(c); return i; };
  writePng(a, img(pack(255, 0, 0)));
  writePng(b, img(pack(0, 0, 255)));
  const text = await said("shot", a, b, "--at", "0,0,4,3", "--at", "4,3,2,2", "--scale", "1");
  assert.match(text, /rows, top down: a\.png, b\.png; columns: 0,0,4,3 \| 4,3,2,2; 1x\)/);
  const png = decodePng(readFileSync(join(dir, "out", "_shot", "a+b.png")));
  // two cells a row (4 wide, a gap of 2, then 2), two rows of 3 with a gap of 2
  assert.deepEqual([png.w, png.h], [4 + 2 + 2, 3 + 2 + 3]);
  assert.deepEqual([png.data[0], png.data[5 * 8]], [pack(255, 0, 0), pack(0, 0, 255)]);
});

test("pxl list maps a file: each statement that defines assets, its lines, the comment above, a loop's assets on one line", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), file = join(dir, "a.px.js");
  writeFileSync(join(dir, "parts.px.js"), `use("pico8")\n// a dot\nsprite("dot", "8")\n`);
  writeFileSync(file, [
    `include("parts.px.js", { palette: true })`,
    `const part = (n) => sprite(n, { w: 2, h: 1 },`,
    `  px(0, 0, "8"), px(1, 0, "7"))`,
    `// the gems: one per color`,
    `for (const c of ["r", "g", "b", "y", "w"])`,
    `  part("gem_" + c)`,
    // a regex with a bracket in it, and a template with an expression, don't throw the count off
    `sprite("slash", { w: 1, h: 1 }, (c) => c.px(0, 0, /[(]/.test("(") ? "8" : "7"))`,
    "scene(`s${\"\" + \"\"}`, { w: 4, h: 4 }, stamp(\"dot\", 0, 0))",
  ].join("\n"));
  const text = await said("list", file);
  // the helper's sprite() call is not where the gems are made: the loop that calls it is
  assert.match(text, /^parts\.px\.js \(\d+ lines\)\n {2}3-3 +sprite: dot {2}\/\/ a dot$/m);
  assert.match(text, /^ {2}5-6 +sprite x5: gem_r, gem_g, gem_b, gem_y \(\+1\) {2}\/\/ the gems: one per color$/m);
  assert.match(text, /^ {2}7-7 +sprite: slash$/m);
  assert.match(text, /^ {2}8-8 +scene: s$/m);
  // functions too; and a file meant to be included, which doesn't run alone, is mapped from its text
  const part = join(dir, "part.px.js");
  writeFileSync(part, `// the gem's shine\nfunction shine(c) {\n  c.px(0, 0, KEY)\n}\nsprite("gem", { w: 1, h: 1 }, (c) => shine(c))\nconst KEY = W > 2 ? "7" : "8"`);
  const alone = await said("list", part);
  assert.match(alone, /^part\.px\.js \(6 lines; not run on its own \(.*W is not defined\)/m);
  assert.match(alone, /^ {2}2-4 +function: shine {2}\/\/ the gem's shine$/m);
  assert.match(alone, /^ {2}5-5 +sprite: gem$/m);
});

test("cli build reports per-asset errors and still writes the rest", async () => {
  const { dir, file } = tmpArt(`use("pico8")\nsprite("good", "8")\nsprite("bad", "z")`);
  const err = console.error, log = console.log;
  const errors: string[] = [];
  console.error = (s: string) => errors.push(s);
  console.log = () => {};
  try { assert.equal(await main(["build", file]), 1); } finally { console.error = err; console.log = log; }
  assert.ok(existsSync(join(dir, "out", "sprites", "good.png")));
  assert.ok(errors.some((e) => e.includes("a.px.js:3:1") && e.includes("unknown color key 'z'")), errors.join("\n"));
});

test("server: state, asset frames, rebuild on change", async () => {
  const { file } = tmpArt(`use("pico8")\nsprite("a", { w: 2, h: 1 }, px(0, 0, "8"), px(1, 0, "7"))`);
  const logs: string[] = [];
  const s = await serve(file, { port: 0, out: false, log: (l) => logs.push(l) });
  try {
    const state = await (await fetch(s.url + "api/state")).json();
    assert.equal(state.assets[0].name, "a");
    const a = await (await fetch(s.url + "api/asset?name=a")).json();
    assert.deepEqual(a.frames.map((f: { label: string }) => f.label), ['px(0, 0, "8")', 'px(1, 0, "7")']);
    assert.equal(a.frames[1].loc, "a.px.js:2:44");
    const html = await (await fetch(s.url)).text();
    assert.ok(html.includes("/app.js"));
    const js = await (await fetch(s.url + "app.js")).text();
    assert.ok(js.includes("EventSource") && !js.includes("interface AssetInfo"));

    writeFileSync(file, `use("pico8")\nsprite("a", { w: 1, h: 1 }, px(0, 0, "9"))`);
    const t0 = Date.now();
    let v = 1;
    while (Date.now() - t0 < 5000) {
      await new Promise((r) => setTimeout(r, 100));
      const st = await (await fetch(s.url + "api/state")).json();
      v = st.version;
      if (v > 1) {
        assert.equal(st.assets[0].w, 1);
        assert.equal(st.assets[0].edited, true);
        break;
      }
    }
    assert.ok(v > 1, "rebuild did not happen");
  } finally {
    s.close();
  }
});

test("aseprite export: redrawing its visible layers the way Aseprite does gives back every frame", () => {
  // outline (its own layer), a shade layer (hidden; its effect goes over), a hidden and a reference layer,
  // a body that never changes (linked cels), pingpong; a mirrored sprite comes out as one layer
  const { dir, file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63", G: "#4c8a44", w: "#fff6e0" }); ramps("kGg")
anim("blink", { w: 6, h: 6, fps: 5, dir: "pingpong", outline: "k" },
  layer("body", rect(0, 0, 6, 6, "g")),
  layer("eye", frame(px(2, 2, "w")), frame(px(3, 2, "w")), frame(px(4, 2, "w"))),
  layer("shadow", { shade: true }, rect(0, 4, 6, 2, "k")),
  layer("mask", { hidden: true }, rect(0, 0, 2, 2, "w")),
  layer("guide", { ref: 0.5 }, px(0, 0, "w")))
sprite("half", { mx: true }, layer("a", "gG"))`);
  const p = loadProject(file), out = join(dir, "out");
  const r = writeOutputs(p, out, { preview: false, aseprite: true });
  assert.ok(r.lines.some((l) => l.includes("half.aseprite (one layer: mx moves the art away from its layers)")), r.lines.join("\n"));
  const b = readFileSync(join(out, "anims", "blink.aseprite"));
  assert.equal(b.readUInt32LE(0), b.length);
  assert.equal(b.readUInt16LE(4), 0xa5e0);
  const [frames, w, h] = [b.readUInt16LE(6), b.readUInt16LE(8), b.readUInt16LE(10)];
  const layers: { name: string; flags: number }[] = [], cels: Img[][] = [], ms: number[] = [];
  let tag: { from: number; to: number; dir: number; name: string } | undefined, linked = 0;
  for (let f = 0, o = 128; f < frames; f++) {
    const end = o + b.readUInt32LE(o), n = b.readUInt32LE(o + 12);
    ms.push(b.readUInt16LE(o + 8));
    cels.push([]);
    for (let c = 0, q = o + 16; c < n; c++) {
      const size = b.readUInt32LE(q), type = b.readUInt16LE(q + 4), d = b.subarray(q + 6, q + size);
      if (type === 0x2004) layers.push({ flags: d.readUInt16LE(0), name: d.toString("utf8", 18, 18 + d.readUInt16LE(16)) });
      if (type === 0x2018) tag = { from: d.readUInt16LE(10), to: d.readUInt16LE(12), dir: d[14], name: d.toString("utf8", 29, 29 + d.readUInt16LE(27)) };
      if (type === 0x2005) {
        const li = d.readUInt16LE(0), x = d.readInt16LE(2), y = d.readInt16LE(4), kind = d.readUInt16LE(7), img = new Img(w, h);
        if (kind === 1) { linked++; cels[f][li] = cels[d.readUInt16LE(16)][li]; }
        else {
          assert.equal(kind, 2);
          const cw = d.readUInt16LE(16), ch = d.readUInt16LE(18), px = inflateSync(d.subarray(20));
          for (let i = 0; i < cw * ch; i++) img.set(x + (i % cw), y + Math.floor(i / cw), px.readUInt32BE(i * 4));
          cels[f][li] = img;
        }
      }
      q += size;
    }
    o = end;
  }
  assert.deepEqual(layers.map((l) => `${l.name}:${l.flags}`), ["body:3", "eye:3", "shadow:2", "mask:2", "outline + effects:3", "guide:67"]);
  assert.deepEqual(tag, { from: 0, to: 2, dir: 2, name: "blink" });
  assert.ok(linked >= 2, "the unchanged body links to frame 0");
  const drawn = p.drawn("blink");
  assert.deepEqual(ms, drawn.map((f) => f.ms));
  drawn.forEach((f, i) => {
    const redrawn = new Img(w, h);
    layers.forEach((l, li) => { if (l.flags === 3 && cels[i][li]) redrawn.blit(cels[i][li], 0, 0); });
    assert.deepEqual([...redrawn.data], [...f.img.data], `frame ${i}`);
  });
});

test("gif palette: a small, distinct figure keeps its color next to big lit areas", () => {
  // a night sky's shades and a warm glow, hundreds of pixels each, and a pale figure of 40 px
  // next to the glow in color: weighting by count alone averaged the figure into the glow (60 off)
  const counts = new Map<number, number>(), rgb = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
  for (let i = 0; i < 900; i++) counts.set(rgb(10 + (i % 30), 10 + Math.floor(i / 30), 40 + (i % 60)), 3000);
  for (let i = 0; i < 400; i++) counts.set(rgb(170 + (i % 20) * 2, 130 + Math.floor(i / 20) * 2, 60 + (i % 7) * 3), 800);
  for (let i = 0; i < 8; i++) counts.set(rgb(150 + i, 140 + i, 125 + i), 5);
  const pal = medianCut(counts, 64);
  const d = Math.min(...pal.map((c) => Math.hypot(((c >> 16) & 255) - 154, ((c >> 8) & 255) - 144, (c & 255) - 129)));
  assert.ok(d < 8, `nearest entry to the figure is ${d.toFixed(0)} away`);
});

test("cli describe: repeats folded, cell maps, exact pixels on request; any PNG by its tiles", async () => {
  const { dir, file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63", w: "#fff6e0" })
sprite("rock", "kk\\nkk")
scene("s", { w: 16, h: 8, bg: "g" }, layer("props", stamp("rock", 0, 0), stamp("rock", 8, 0), stamp("rock", 12, 4)), px(5, 5, "w"))`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try {
    assert.equal(await main(["describe", file, "s", "--cell", "4", "--at", "4,4,4,2"]), 0);
    writePng(join(dir, "tiles.png"), loadProject(file).image("s"));
    assert.equal(await main(["describe", join(dir, "tiles.png"), "--at", "0,0,2,1"]), 0);
  } finally { console.log = log; }
  const [scene, png] = lines;
  assert.match(scene, /A rock #1 @props: x 0-1, y 0-1 \(2x2\), feet 1,1; colors k\n\s+nearest: rock #2 6px right/);   // ranges worked out
  assert.match(scene, /ON TOP[^\n]*\n[^\n]*\n[^\n]*\n {2}0 A.A.\n {2}4 \.\.\.A/);  // the rock on top of its cells
  assert.match(scene, /PIXELS 4,4 4x2[^\n]*\n[^\n]*\n[^\n]*\n {2}4 gggg\n {2}5 gwgg/);
  assert.match(png, /REGIONS[^\n]*\n {2}\w=#8ccf63 \d+px over x 0-15, y 0-7/);   // the ground, as background
  assert.match(png, /PIXELS 0,0 2x1[^\n]*\n[^\n]*\n[^\n]*\n {2}0 \w\w/);
});

test("describe --diff: what changed since the last describe (moved, recolored, regions)", async () => {
  const art = (x: number, g: string) => `pal({ k: "#1b1630", g: "${g}" })
sprite("rock", "kk\\nkk")
scene("s", { w: 32, h: 20, bg: "g" }, layer("props", stamp("rock", 2, 2), stamp("rock", ${x}, 10)))`;
  const { dir, file } = tmpArt(art(10, "#8ccf63"));
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try {
    assert.equal(await main(["describe", file, "s"]), 0);
    writeFileSync(file, art(13, "#7cc053"));
    assert.equal(await main(["describe", file, "s", "--diff"]), 0);
  } finally { console.log = log; }
  assert.ok(existsSync(join(dir, "out", "_describe", "a.s.json")));   // kept by file and name: two files' "s" in one out dir don't mix
  const diff = lines[1];
  assert.match(diff, /recolor: #8ccf63 -> g=#7cc053 on \d+ px/);
  assert.match(diff, /region x 10-14, y 10-11: 8 px \([^)]*rock #2 4px[^)]*\)/);   // where it left and where it went
  assert.match(diff, /rock #2: moved \+3,\+0/);
  assert.doesNotMatch(diff, /rock #1:/);   // the other rock did not change
});

test("describe: a stamp at a fractional position is placed where it was drawn", async () => {
  const { file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63" }); ramps("kg")
sprite("rock", "kk\\nkk")
scene("s", { w: 16, h: 8, bg: "g" }, layer("props", stamp("rock", 3.7, 2.2)), layer("sh", { shade: true }, stamp("rock", 8.5, 4.9)))`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["describe", file, "s", "--no-out"]), 0); } finally { console.log = log; }
  assert.match(lines[0], /A rock @props: x 3-4, y 2-3 \(2x2\)/);
});

test("describe --brief: one line per object, no color or light maps, no steps", async () => {
  const { file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63" })
sprite("rock", "kk\\nkk")
scene("s", { w: 16, h: 8, bg: "g" }, layer("props", stamp("rock", 0, 0), stamp("rock", 1, 1)))`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["describe", file, "s", "--brief", "--no-out"]), 0); } finally { console.log = log; }
  assert.match(lines[0], /A rock #1 @props: x 0-1, y 0-1 \(2x2\), feet 1,1; 75% shows; near rock #2 touching right; behind rock #2; lum \d\/\d dE \d+\n/);
  assert.doesNotMatch(lines[0], /COLOR|LIGHT|PAINTED|nearest:/);
});

test("describe an opaque PNG: large one-color patches are the background, the rest are objects", async () => {
  // a dithered sky over grass (patches stay whole), two identical rocks, one bush, a few specks
  const { dir, file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63", s: "#3b5dc9", S: "#29366f", w: "#fff6e0", r: "#b13e53" })
sprite("rock", "kk\\nkk")
sprite("bush", ".rr.\\nrrrr\\nrrrr")
scene("s", { w: 40, h: 24, bg: "g" }, dither(0, 0, 40, 12, "s", "S", 0.5), px(5, 3, "w"), px(30, 5, "w"),
  stamp("rock", 4, 16), stamp("rock", 20, 18), stamp("bush", 30, 15))`);
  writePng(join(dir, "s.png"), loadProject(file).image("s"));
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try { assert.equal(await main(["describe", join(dir, "s.png"), "--no-out"]), 0); } finally { console.log = log; }
  const out = lines[0];
  assert.match(out, /REGIONS[^\n]*\n {2}\w=#8ccf63 \d+px over x 0-39, y 12-23/);   // the grass
  assert.match(out, /x 30-33, y 15-17 \(4x3\), 10px, colors \w/);                  // the bush
  assert.match(out, /repeated \(identical or mirrored\):\n {4}2x2 x2, colors \w: 4,16 {2}20,18/);
  assert.match(out, /and 2 specks of 1-3 px/);
  assert.doesNotMatch(out, /TILES/);                                               // no grid repeats here
});

test("describe: objects with their ranges, gaps and cover; shapes on a clear background, mirrored ones too", async () => {
  const { dir, file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63", w: "#fff6e0" })
sprite("rock", "kk\\nkk")
sprite("arrow", "kw\\nk.")
scene("s", { w: 16, h: 8, bg: "g" }, layer("props", stamp("rock", 0, 0), stamp("rock", 1, 1), stamp("arrow", 8, 4)))
scene("sheet", { w: 16, h: 8 }, stamp("rock", 0, 0), stamp("rock", 4, 0), stamp("arrow", 8, 0), stamp("arrow", 12, 0, { flip: "x" }))`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try {
    assert.equal(await main(["describe", file, "s"]), 0);
    writePng(join(dir, "sheet.png"), loadProject(file).image("sheet"));
    assert.equal(await main(["describe", join(dir, "sheet.png")]), 0);
  } finally { console.log = log; }
  const [scene, sheet] = lines;
  // the second rock covers 1 px of the first
  assert.match(scene, /A rock #1 @props: x 0-1, y 0-1 \(2x2\), feet 1,1; 75% shows; colors k\n\s+behind rock #2 \(1px\); nearest: rock #2 touching right/);
  assert.match(scene, /B arrow @props: x 8-9, y 4-5 \(2x2\)[^\n]*\n\s+nearest: rock #2 5px left/);
  assert.match(sheet, /SHAPES[^\n]*2 distinct of 4[^\n]*\n {2}A 2x2 x2: 0,0 {2}4,0\n {2}B 2x2 x2: 8,0 {2}12,0 flipped/);
});

test("pxl help: an index of the reference, or what it says about one name and where examples use it", async () => {
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(s);
  try {
    assert.equal(await main(["help"]), 0);
    assert.equal(await main(["help", "wrap"]), 0);
    assert.equal(await main(["help", "scater"]), 0);
  } finally { console.log = log; }
  const [index, wrap, typo] = lines;
  assert.match(index, /Ops > Shapes: px grid rect box line curve/);
  assert.match(index, /scenes\.md: 1\. Layout and scale \(\d\.\d\);/);
  assert.match(wrap, /\[reference\.md: Assets > Sprite \/ scene options\]\n\| `wrap: true/);
  assert.match(wrap, /\[examples: \d+ uses[^\]]*\]\n {2}examples\/[\w/]+\.px\.js:\d+:/);
  assert.match(typo, /nothing about 'scater'.*did you mean 'scatter'/);
});

test("pxl help is short: other mentions a line each, a guide section by its heading, --all for everything", async () => {
  const said = async (...argv: string[]) => {
    const log = console.log, lines: string[] = [];
    console.log = (s: string) => lines.push(s);
    try { await main(argv); } finally { console.log = log; }
    return lines.join("\n");
  };
  const stamp = await said("help", "stamp"), full = await said("help", "stamp", "--all");
  // the row that defines it whole; every other place one line, a few of them; three example uses
  assert.match(stamp, /^\| `stamp\(name, x = 0, y = 0, opts\?\)` \|/m);
  assert.match(stamp, /^ {2}\(…\d+ more: pxl help stamp --all\)$/m);
  assert.match(stamp, /\[examples: \d+ uses, 3 shown\]/);
  assert.ok(stamp.length < 2500 && full.length > 2 * stamp.length, `${stamp.length} vs ${full.length}`);
  // words of a heading: that section, whole; a guide's name narrows to it
  assert.match(await said("help", "small animals"), /^\[characters\.md\]\n## 9\. Small animals\n/);
  assert.match(await said("help", "characters 9"), /^\[characters\.md\]\n## 9\. Small animals\n/);
  // a name that is an op: its rows, and the sections that share its words named, not printed
  assert.match(await said("help", "light"), /\[guides: 2 sections\]\n {2}pxl help "scenes 11. Shadows and light"/);
  // heading words are whole words: "anim" is the reference's Animation, not "Small animals"
  const anim = await said("help", "anim");
  assert.match(anim, /^\[reference\.md: Animation\]/m);
  assert.doesNotMatch(anim, /Small animals/);
  assert.match(await said("help", "glow"), /^\[reference\.md: Glow\][^]*`keep`/m);
  assert.match(await said("help", "castBase"), /^\| `castBase: "pivot" \\| "column"` \|/m);
});

test("cli shot of a GIF: drawn larger, read at 1x; all its frames in rows of 12; a range picks some", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-")), gif = join(dir, "clip.gif");
  const colors = [pack(200, 40, 40), pack(40, 160, 60), pack(40, 60, 200), pack(230, 210, 60), pack(20, 20, 30)];
  const frames = Array.from({ length: 14 }, (_, f) => {
    // big enough to show its grid: eight of its pixels a side at least
    const img = new Img(16, 12);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) img.set(x, y, colors[(Math.floor(latticeHash(Math.floor(x / (1 + ((y * 7) % 3))), y) * 5) + f) % 5]);
    return { img: img.scale(3), ms: 100 };
  });
  writeFileSync(gif, encodeGif(frames));
  const text = await said("shot", gif, "--scale", "1");
  assert.match(text, /clip\.gif: GIF, drawn at 3x, shown at 1x, frames all 14/);
  const png = decodePng(readFileSync(join(dir, "out", "_shot", "clip.png")));
  assert.deepEqual([png.w, png.h], [12 * 16 + 11 * 2, 12 + 2 + 12], "two rows: 12 frames, then 2");
  assert.match(await said("shot", gif, "--frames", "2-4", "--scale", "1"), /frames 2,3,4/);
  const some = decodePng(readFileSync(join(dir, "out", "_shot", "clip.png")));
  assert.deepEqual([some.w, some.h], [3 * 16 + 2 * 2, 12]);
});

test("package.json ships every example folder (the skill points to them all)", () => {
  const root = join(import.meta.dirname, ".."), files: string[] = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).files;
  const dirs = execFileSync("git", ["ls-files", "examples"], { cwd: root, encoding: "utf8" }).split("\n").filter((f) => f.split("/").length > 2).map((f) => f.split("/")[1]);
  for (const d of new Set(dirs)) assert.ok(files.some((f) => f.startsWith(`examples/${d}/`)), `examples/${d}/ is not in package.json files`);
});

test("--scale is a whole number: at 2.5x a picture's pixels would come out 2 and 3 px wide by turns", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pxl-scale-")), file = join(dir, "a.px.js");
  writeFileSync(file, 'pal({ k: "#000000" }); sprite("a", { w: 2, h: 2 }, rect(0, 0, 2, 2, "k"))');
  const err = console.error, said: string[] = [];
  console.error = (s: string) => said.push(String(s));
  try { await main(["build", file, "--scale", "2.5", "--out", join(dir, "out")]); } catch (e) { said.push(String((e as Error).message)); } finally { console.error = err; }
  assert.match(said.join("\n"), /--scale is a whole number/);
});

test("build --share N: each asset N times bigger in out/share, clear kept, a GIF when it moves; a whole number only", async () => {
  const { dir, file } = tmpArt(`pal({ k: "#1b1630", g: "#8ccf63" })
sprite("dot", "gk\\n.g")
anim("blink", { w: 2, h: 1, frames: 2, fps: 4 }, (c) => c.px(c.frame, 0, "g"))`);
  const log = console.log;
  console.log = () => {};
  try { assert.equal(await main(["build", file, "--share", "3"]), 0); } finally { console.log = log; }
  const dot = decodePng(readFileSync(join(dir, "out", "share", "dot.png")));
  assert.deepEqual([dot.w, dot.h, dot.get(1, 4) & 255, dot.get(4, 4) & 255], [6, 6, 0, 255]);   // the clear corner stays clear
  assert.ok(existsSync(join(dir, "out", "share", "blink.gif")));
  const err = console.error, said: string[] = [];
  console.error = (s: string) => said.push(String(s));
  try { await main(["build", file, "--share", "2.5"]); } catch (e) { said.push(String((e as Error).message)); } finally { console.error = err; }
  assert.match(said.join("\n"), /--share is a whole number/);
});

test("shot: a hand-drawn sprite's LOOK lines, their pixels ringed in <name>_look.png", async () => {
  const rows = ["kk..............", "..kk............", "....kkk.........", "......kkk.......", ".........kkk....", "............kkkk"];
  const { dir, file } = tmpArt(`pal({ k: "#1b1630" }); sprite("hand", ${JSON.stringify(rows.join("\n"))})`);
  const log = console.log, lines: string[] = [];
  console.log = (s: string) => lines.push(String(s));
  try { await main(["shot", file, "hand"]); } finally { console.log = log; }
  assert.match(lines.join("\n"), /hand › LOOK: 1 L-corner/);
  assert.ok(existsSync(join(dir, "out", "_shot", "hand_look.png")));
});
