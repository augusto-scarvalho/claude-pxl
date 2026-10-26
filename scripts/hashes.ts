// A hash of every asset an art file makes (frame 0), a line each: run it before and after a change to
// the engine that shouldn't move a pixel (a refactor, a faster path). The tests keep only what
// `pxl check` says, and `pxl shot --vs` compares versions of the art, not of pxl.
//
//   node scripts/hashes.ts > after.txt                every example (as the tests list them)
//   node scripts/hashes.ts examples/hd2d/graveyard.px.js examples/perspective/race.px.js
//   node scripts/hashes.ts --vs HEAD                  every example built by the last commit's pxl too: what differs
//   node scripts/hashes.ts --vs HEAD --frames 12 --only "^graveyard" examples/hd2d/graveyard.px.js
//
// --vs <rev> builds each file with the pxl and the examples at a git revision too (unpacked once into
// the system's temp folder, see vs.ts), in this process, and prints only the lines that differ and a
// count; it exits 1 when one does. --frames hashes every frame of the animated assets, `asset@frame`
// a line (--frames N: N frames spread over the loop, a cheap look at a long scene). --only <regex>: the
// assets whose name matches. A file that doesn't build on its own (included only) prints SKIP; an asset
// that fails prints ERR and the error's first words.
import { join, relative, resolve } from "node:path";
import { frameCount, frameTime } from "../src/node/shot.ts";
import { examples, inTree, loader, pick, repo, revTree } from "./vs.ts";

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(k); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const vs = opt("--vs"), only = new RegExp(opt("--only") ?? "");
let cap = 1;
const fi = args.indexOf("--frames");
if (fi >= 0) { cap = /^\d+$/.test(args[fi + 1] ?? "") ? +args[fi + 1] : Infinity; args.splice(fi, cap === Infinity ? 1 : 2); }
const files = args.length ? args.map((f) => resolve(f)) : examples().map((f) => join(repo, "examples", f));

function lines(load: (f: string) => any, file: string, name: string): Map<string, string> {
  const out = new Map<string, string>();
  let p;
  try { p = load(file); } catch { return out.set(name, "SKIP"); }
  for (const n of p.order as string[]) {
    if (!only.test(n)) continue;
    try {
      for (const i of pick(frameCount(p, n), cap)) {
        const t = frameTime(p, n, i);
        out.set(i ? `${name} ${n}@${i}` : `${name} ${n}`, p.image(n, 0, t).hash());
        p.forget(n, t);
      }
    } catch (e) { out.set(`${name} ${n}`, `ERR ${(e as Error).message.slice(0, 60)}`); }
  }
  return out;
}

const here = await loader(repo), tree = vs ? revTree(vs) : "", there = vs ? await loader(tree) : undefined;
let same = 0, differ = 0;
for (const f of files) {
  const rel = relative(join(repo, "examples"), f).split("\\").join("/"), name = rel.startsWith("..") ? f : rel, b = lines(here, f, name);
  if (!there) { for (const [k, h] of b) console.log(`${k} ${h}`); continue; }
  const a = lines(there, inTree(tree, f), name);
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if (a.get(k) === b.get(k)) { same++; continue; }
    differ++;
    console.log(`${k}: ${a.get(k) ?? "(none)"} at ${vs}, ${b.get(k) ?? "(none)"} here`);
  }
}
if (vs) {
  console.log(`${same} the same, ${differ} differ (${vs} against the working tree)`);
  if (differ) process.exitCode = 1;
}
