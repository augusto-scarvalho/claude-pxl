// A hash of every asset an art file makes (frame 0), a line each: run it before and after a change to
// the engine that shouldn't move a pixel (a refactor, a faster path) and diff the two. The tests keep
// only what `pxl check` says, and `pxl shot --vs` compares versions of the art, not of pxl.
//
//   node scripts/hashes.ts examples/hd2d/graveyard.px.js examples/perspective/race.px.js > before.txt
//
// An asset that fails prints ERR and the error's first words, so a change that breaks one shows too.
import { basename, resolve } from "node:path";
import { loadProject } from "../src/node/load.ts";

for (const f of process.argv.slice(2)) {
  const p = loadProject(resolve(f));
  for (const n of p.order) {
    let h: string;
    try { h = p.image(n).hash(); } catch (e) { h = `ERR ${(e as Error).message.slice(0, 60)}`; }
    console.log(`${basename(f)} ${n} ${h}`);
  }
}
