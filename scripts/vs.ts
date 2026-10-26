// What hashes.ts and perf.ts share to compare the pxl at a git revision with the working tree: the
// revision's src/ and examples/ unpacked once into the system's temp folder (pxl-rev-<commit>, kept
// for the next run), each tree's own loader, the examples as the tests list them, frames over a loop.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const repo = resolve(import.meta.dirname, "..");

/** The examples the tests check (no `_` files, no `out/`, no pipeline parts): paths under examples/. */
export const examples = () => (readdirSync(join(repo, "examples"), { recursive: true }) as string[]).map((f) => f.split("\\").join("/"))
  .filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out") && !/(^|\/)pipeline\/part_/.test(f)).sort();

/** The folder holding the revision's src/ and examples/: unpacked on the first call. */
export function revTree(rev: string): string {
  const sha = execFileSync("git", ["rev-parse", "--verify", `${rev}^{commit}`], { cwd: repo, encoding: "utf8" }).trim();
  const dir = join(tmpdir(), `pxl-rev-${sha.slice(0, 12)}`), part = `${dir}.part`;
  if (!existsSync(dir)) {
    rmSync(part, { recursive: true, force: true });
    mkdirSync(part);
    execFileSync("git", ["archive", "-o", join(part, "rev.tar"), sha, "src", "examples"], { cwd: repo });
    execFileSync("tar", ["-xf", "rev.tar"], { cwd: part });
    rmSync(join(part, "rev.tar"));
    renameSync(part, dir);
  }
  return dir;
}

/** The same art file in another tree (one outside the repo: itself, built by the other pxl). */
export function inTree(tree: string, file: string): string {
  const rel = relative(repo, resolve(file));
  return rel.startsWith("..") || isAbsolute(rel) ? resolve(file) : join(tree, rel);
}

/** loadProject of the pxl in that tree. */
export const loader = async (tree: string) => (await import(pathToFileURL(join(tree, "src/node/load.ts")).href)).loadProject;

/** Frame numbers of a loop of `count`: all of them, or `cap` spread over it (frame 0 first). */
export const pick = (count: number, cap = Infinity) => count <= cap ? [...Array(count).keys()] : Array.from({ length: cap }, (_, k) => Math.floor((k * count) / cap));
