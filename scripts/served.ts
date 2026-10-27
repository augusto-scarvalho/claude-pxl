// What the live viewer costs for one asset, measured as the page meets it: the server's first build of
// the file, what selecting the asset fetches (its payload with the painting steps, and its thumbnail's),
// and a long loop's frames, fetched one at a time as the page plays them. A scene's frames all sent with
// it held 2.65 GB on the HD graveyard's page (the browser froze); as PNGs on demand, a 1.6 MB payload,
// then 0.5 MB and 2.3 s a frame (2026-10, a 4-core laptop).
//
//   node scripts/served.ts examples/hd2d/graveyard.px.js                     the file's assets, a line each
//   node scripts/served.ts examples/hd2d/graveyard.px.js graveyard_hd        one asset (8 of a long loop's frames)
//   node scripts/served.ts examples/hd2d/graveyard.px.js graveyard_hd --frames 20 --vs HEAD
//
// --vs <rev> measures the server at a git revision first (unpacked once into the system's temp folder,
// see vs.ts), then yours. "The page holds" counts what it decodes: the picture and the thumbnail's, each
// painting step's picture or changes, the frames.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { inTree, repo, revTree } from "./vs.ts";

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(k); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const vs = opt("--vs"), nf = Number(opt("--frames") ?? 8), [file, name] = args;
if (!file) { console.error("usage: node scripts/served.ts <art.px.js> [<asset>] [--frames N] [--vs <rev>]"); process.exit(2); }
const size = (n: number) => (n < 1e6 ? (n / 1e3).toFixed(1) + " kB" : (n / 1e6).toFixed(2) + " MB");

for (const [label, tree] of vs ? [[vs, revTree(vs)], ["here", repo]] : [["here", repo]]) {
  const { serve } = await import(pathToFileURL(join(tree, "src/node/server.ts")).href);
  const t0 = performance.now(), s = await serve(inTree(tree, file), { port: 0, out: false, log: () => {} });
  const get = async (path: string) => {
    const t = performance.now(), r = await fetch(s.url + path), body = Buffer.from(await r.arrayBuffer());
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${body.toString().slice(0, 120)}`);
    return { body, ms: performance.now() - t };
  };
  try {
    const st = JSON.parse((await get("api/state")).body.toString());
    console.log(`${label}: the server's first build ${(performance.now() - t0).toFixed(0)} ms, ${st.assets.length} assets`);
    if (!name) {
      for (const a of st.assets.filter((a: any) => !a.part)) console.log(`  ${a.name} ${a.kind} ${a.w}x${a.h}${a.steps ? `, ${a.steps} painting steps` : ""}${a.error ? ` ERR ${a.error.message}` : ""}`);
      continue;
    }
    const q = encodeURIComponent(name), sel = await get(`api/asset?name=${q}&frames=1`), thumb = await get(`api/asset?name=${q}&frames=0`);
    const j = JSON.parse(sel.body.toString()), px = j.w * j.h * 4, inline = j.anim?.images?.length ?? 0, count = j.anim?.ms.length ?? 0;
    const steps = j.frames.reduce((n: number, f: any) => n + (f.png || f.full ? f.w * f.h * 4 : 0) + (f.changes ? (f.changes.length * 3) / 4 : 0), 0);
    console.log(`  ${name} ${j.w}x${j.h}, ${j.frames.length} painting steps${count ? `, ${count} frames ${inline ? "inline as PNGs" : "fetched one at a time"}` : ""}`);
    console.log(`  select: ${size(sel.body.length)} in ${sel.ms.toFixed(0)} ms; thumbnail: ${size(thumb.body.length)} in ${thumb.ms.toFixed(0)} ms`);
    let k = 0, bytes = 0, ms = 0;
    if (count && !inline) {
      for (; k < Math.min(nf, count); k++) { const f = await get(`api/frame?name=${q}&i=${k}&v=${st.version}`); bytes += f.body.length; ms += f.ms; }
      console.log(`  frames 0-${k - 1}: ${size(bytes / k)} each in ${(ms / k).toFixed(0)} ms`);
    }
    console.log(`  the page holds ${size(2 * px + steps + (inline + k) * px)}: the picture and the thumbnail's ${size(2 * px)}, the steps ${size(steps)}` +
      `${inline + k ? `, ${inline + k} frames ${size((inline + k) * px)}` : ""}`);
  } finally {
    s.close();
  }
}
console.log(`peak memory of this process (the server and the client) ${size(process.resourceUsage().maxRSS * 1024)}`);
