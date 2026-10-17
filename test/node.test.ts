import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { decodePng, encodePng } from "../src/node/png.ts";
import { main } from "../src/node/cli.ts";
import { loadProject } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
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

function tmpArt(src: string): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), "pxl-"));
  const file = join(dir, "a.px.js");
  writeFileSync(file, src);
  return { dir, file };
}

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
