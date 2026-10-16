// pxl command line.
import { dirname, join, resolve } from "node:path";
import { PxError, wrap } from "../core/errors.ts";
import { ascii } from "../core/render.ts";
import { loadProject } from "./load.ts";
import { writeOutputs } from "./output.ts";
import { serve } from "./server.ts";

const USAGE = `pxl — pixel-art DSL

  pxl build <art.px.js> [--out DIR] [--only a,b] [--scale N] [--no-preview]
      Build PNGs (out/sprites, out/scenes, out/anims strips + JSON + GIF, sheets + JSON) and
      previews (out/_preview; animated assets also get a .gif).
  pxl serve <art.px.js> [--port 4321] [--out DIR | --no-out] [--no-preview]
      Live viewer: rebuilds on save and replays each asset's painting steps.
  pxl ascii <art.px.js> <name>
      Print an asset as palette keys with x/y rulers (anims: every frame).
  pxl list  <art.px.js>
      List assets, groups and sheets with their source locations.

Art files may be .js or .ts. Default out dir: <art file dir>/out.`;

interface Args {
  cmd?: string;
  file?: string;
  rest: string[];
  out?: string | false;
  only?: string[];
  scale?: number;
  preview?: boolean;
  port?: number;
}

function parse(argv: string[]): Args {
  const a: Args = { rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    const val = () => {
      const x = argv[++i];
      if (x === undefined) throw new PxError(`${v} needs a value`);
      return x;
    };
    if (v === "--out") a.out = val();
    else if (v === "--no-out") a.out = false;
    else if (v === "--only") a.only = val().split(",").map((s) => s.trim()).filter(Boolean);
    else if (v === "--scale") a.scale = Number(val());
    else if (v === "--port") a.port = Number(val());
    else if (v === "--no-preview") a.preview = false;
    else if (v === "-h" || v === "--help") a.cmd = "help";
    else if (v.startsWith("--")) throw new PxError(`unknown flag ${v}\n\n${USAGE}`);
    else if (!a.cmd) a.cmd = v;
    else if (!a.file) a.file = v;
    else a.rest.push(v);
  }
  return a;
}

export async function main(argv: string[]): Promise<number> {
  let a: Args;
  try { a = parse(argv); } catch (e) { console.error(wrap(e).message); return 2; }
  if (!a.cmd || a.cmd === "help" || !a.file) {
    console.log(USAGE);
    return a.cmd === "help" ? 0 : 2;
  }
  const file = resolve(a.file);
  const outDir = typeof a.out === "string" ? resolve(a.out) : join(dirname(file), "out");
  try {
    switch (a.cmd) {
      case "build": {
        const p = loadProject(file);
        const r = writeOutputs(p, outDir, { only: a.only, preview: a.preview, scale: a.scale });
        for (const l of r.lines) console.log(l);
        for (const e of r.errors) console.error("error: " + e.message);
        console.log(`-> ${outDir}${r.errors.length ? ` (${r.errors.length} error${r.errors.length > 1 ? "s" : ""})` : ""}`);
        return r.errors.length ? 1 : 0;
      }
      case "ascii": {
        const name = a.rest[0];
        if (!name) throw new PxError("ascii needs an asset name: pxl ascii <file> <name>");
        const p = loadProject(file);
        const pal = p.assets.get(name)?.pal ?? p.pal;
        if (p.assets.get(name)?.kind === "anim")
          p.drawn(name).forEach((f, i) => console.log(`frame ${i} (${f.ms}ms)\n${ascii(f.img, pal)}\n`));
        else console.log(ascii(p.image(name), pal));
        return 0;
      }
      case "list": {
        const p = loadProject(file);
        for (const n of p.order) {
          const d = p.assets.get(n)!;
          console.log(`${d.kind.padEnd(6)} ${n.padEnd(24)} ${d.loc ?? ""}`);
        }
        for (const g of p.groups.values()) console.log(`${"group".padEnd(6)} ${g.name.padEnd(24)} ${g.loc ?? ""}  [${g.members.join(" ")}]`);
        for (const s of p.sheets) console.log(`${"sheet".padEnd(6)} ${s.name.padEnd(24)} ${s.loc ?? ""}`);
        return 0;
      }
      case "serve": {
        const s = await serve(file, { port: a.port, out: a.out === false ? false : outDir, preview: a.preview });
        console.log(`pxl live viewer: ${s.url}  (watching ${file}; Ctrl+C to stop)`);
        return await new Promise<number>(() => {});
      }
      default:
        console.error(`unknown command '${a.cmd}'\n\n${USAGE}`);
        return 2;
    }
  } catch (e) {
    console.error("error: " + wrap(e).message);
    return 1;
  }
}
