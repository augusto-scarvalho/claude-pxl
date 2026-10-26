// The slow tests' shortcut: what a test reads, hashed (pxl's sources, Node's version, the files it
// names), kept in node_modules/.cache/pxl/ when it passed; a run with none of that changed skips the
// work and says so. examples.test.ts keeps one per example, gallery.test.ts one.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const root = join(import.meta.dirname, "..");
const CACHE = join(root, "node_modules", ".cache", "pxl");
let src: string | undefined;

/** A hash of pxl's sources and Node's version, then of each file named (a path under the repo; one gone counts as gone). */
export function fingerprint(files: string[]): string {
  if (!src) {
    const h = createHash("sha1").update(process.version);
    for (const f of (readdirSync(join(root, "src"), { recursive: true }) as string[]).sort()) {
      const p = join(root, "src", f);
      if (statSync(p).isFile()) h.update(f).update(readFileSync(p));
    }
    src = h.digest("hex");
  }
  const h = createHash("sha1").update(src);
  for (const f of files) {
    h.update(f);
    try { h.update(readFileSync(join(root, f))); } catch { h.update("\0gone"); }
  }
  return h.digest("hex");
}

/** What the test kept under that name when it last passed ("" if nothing). */
export const passed = (name: string) => { try { return readFileSync(join(CACHE, name), "utf8"); } catch { return ""; } };
export const pass = (name: string, text: string) => { try { mkdirSync(CACHE, { recursive: true }); writeFileSync(join(CACHE, name), text); } catch { /* only a shortcut */ } };
