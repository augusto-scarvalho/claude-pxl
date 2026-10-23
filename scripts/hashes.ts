// A hash of every asset an art file makes (frame 0), a line each: run it before and after a change to
// the engine that shouldn't move a pixel (a refactor, a faster path) and diff the two. The tests keep
// only what `pxl check` says, and `pxl shot --vs` compares versions of the art, not of pxl.
//
//   node scripts/hashes.ts > after.txt          every example (as the tests list them)
//   node scripts/hashes.ts examples/hd2d/graveyard.px.js examples/perspective/race.px.js > before.txt
//
// Before the change, the same run in a checkout of the last commit (`git worktree add <dir> HEAD`,
// then `node <dir>/scripts/hashes.ts`), or with the change stashed. A file that doesn't build on its
// own (included only) prints SKIP; an asset that fails prints ERR and the error's first words.
import { readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProject } from "../src/node/load.ts";

const examples = join(dirname(fileURLToPath(import.meta.url)), "..", "examples");
const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => resolve(f))
  : (readdirSync(examples, { recursive: true }) as string[]).map((f) => f.split("\\").join("/"))
    .filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out") && !/(^|\/)pipeline\/part_/.test(f)).sort().map((f) => join(examples, f));
for (const f of files) {
  const name = relative(examples, f).split("\\").join("/");
  let p;
  try { p = loadProject(f); } catch { console.log(`${name} SKIP`); continue; }
  for (const n of p.order) {
    let h: string;
    try { h = p.image(n).hash(); } catch (e) { h = `ERR ${(e as Error).message.slice(0, 60)}`; }
    console.log(`${name} ${n} ${h}`);
  }
}
