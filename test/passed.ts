// The slow tests' shortcut: what a test reads, hashed (pxl's sources, Node's version, the files it
// names), kept in node_modules/.cache/pxl/ when it passed; a run with none of that changed skips the
// work and says so. examples.test.ts keeps one per example, gallery.test.ts one, the other test files
// one each (whenChanged). A test that reads a file its key doesn't name fails (recordReads): an edit
// to that file would have skipped it.
import { createHash } from "node:crypto";
import fs, { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test, type TestContext } from "node:test";

export const root = join(import.meta.dirname, "..");
const CACHE = join(root, "node_modules", ".cache", "pxl");
let src: string | undefined;

/** A hash of pxl's sources and Node's version, then of each file named (a path under the repo; one gone counts as gone). */
export function fingerprint(files: string[]): string {
  if (!src) {
    const h = createHash("sha1").update(process.version);
    // (with this file and the suite's preload, which every cached test runs too)
    for (const f of [...(readdirSync(join(root, "src"), { recursive: true }) as string[]).sort().map((f) => `src/${f}`), "test/passed.ts", "test/compile-cache.ts"]) {
      const p = join(root, f);
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

/**
 * From now on, each path under the repo this thread reads, stats or lists through node:fs, from the
 * repo ("lib/nature/kit.px.js"; src/ and node_modules/ left out): what a cached test's key has to name.
 * Not seen: imports, fs.promises, child processes.
 */
export function recordReads(): Set<string> {
  const seen = new Set<string>();
  for (const k of ["readFileSync", "readFile", "existsSync", "statSync", "lstatSync", "readdirSync", "openSync", "createReadStream"] as const) {
    const f = fs[k] as (...a: unknown[]) => unknown;
    Object.assign(fs, { [k](p: unknown, ...a: unknown[]) {
      const r = typeof p === "string" || p instanceof URL ? relative(root, p instanceof URL ? fileURLToPath(p) : resolve(p)).split(sep).join("/") : "";
      if (r && !isAbsolute(r) && !/^(\.\.|src|node_modules)(\/|$)/.test(r)) seen.add(r);
      return f(p, ...a);
    } });
  }
  syncBuiltinESMExports();
  return seen;
}

/**
 * node:test's test() for a test file that reads only pxl's sources, itself, test/helpers.ts and the
 * files named: while none of them changed since all its tests last passed, they are skipped as one
 * (painting edits none of them). A file that reads more than it can name (docs, node) runs every time.
 * One that reads a file it doesn't name (an art file's includes, its PNGs) fails, saying which.
 */
export function whenChanged(file: string, reads: string[] = []): (name: string, fn: (t: TestContext) => unknown) => void {
  const files = [file, "test/helpers.ts", ...reads], key = fingerprint(files), name = `${basename(file, ".test.ts")}-passed.txt`;
  if (passed(name) === key) {
    test(`${basename(file)}: every test`, { skip: "nothing it reads changed since its tests last passed" });
    return () => {};
  }
  let n = 0, ok = 0;
  const seen = recordReads();
  after(() => {
    // (a folder listed counts as named when a file named is in it)
    const unnamed = [...seen].filter((r) => !files.some((f) => f === r || f.startsWith(r + "/")));
    if (unnamed.length) throw new Error(`${file} read ${unnamed.join(", ")}, which whenChanged("${file}", [...]) doesn't name: an edit there would skip its tests. Name ${unnamed.length > 1 ? "them" : "it"} there`);
    if (ok === n) pass(name, key);
  });
  return (title, fn) => { n++; test(title, async (t) => { await fn(t); ok++; }); };
}
