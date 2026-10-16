import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, inflateSync } from "node:zlib";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { encodePng } from "../src/node/png.ts";
import { main } from "../src/node/cli.ts";
import { loadProject } from "../src/node/load.ts";
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

test("include { palette: true } shares the included palette", () => {
  const { dir, file } = tmpArt(`include("pal.px.js", { palette: true })\nsprite("b", "z")`);
  writeFileSync(join(dir, "pal.px.js"), `pal({ z: "#ff0000" })`);
  assert.equal(loadProject(file).image("b").data[0], pack(255, 0, 0));
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
