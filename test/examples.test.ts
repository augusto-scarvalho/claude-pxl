// What `pxl check` says about every example, kept in test/examples.checks.txt: a change to a check (or
// to an example) that adds or removes a warning anywhere, or what the checks could run on, shows up here.
// The two warnings today are known: the knights scene shows a flipped knight beside the turned one, lit
// from the wrong side (its lesson); the cemetery's crypt is misread (its outline is mostly trims: the
// cornice, the steps; its columns are lit from the right, as the scene is).
// After a change you meant, rewrite the file: PXL_UPDATE=1 npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProject } from "../src/node/load.ts";
import { checkProject } from "../src/node/check.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP = join(root, "test", "examples.checks.txt");

test("pxl check on every example: the same warnings as kept", () => {
  const files = (readdirSync(join(root, "examples"), { recursive: true }) as string[])
    .map((f) => f.split("\\").join("/")).filter((f) => f.endsWith(".px.js") && !f.split("/").some((s) => s.startsWith("_") || s === "out")).sort();
  const out: string[] = [];
  for (const f of files) {
    try {
      const p = loadProject(join(root, "examples", f));
      // every frame of every animated scene (the bout's blows, the blocks, the last clash included)
      const r = checkProject(p, { file: basename(f) });
      out.push(`${f}: ${r.warnings} warning${r.warnings === 1 ? "" : "s"} (${r.checked})`, `  ${r.coverage}`, ...r.lines.map((l) => "  " + l));
    } catch {
      out.push(`${f}: included only (doesn't build on its own: its palette comes from the file including it)`);
    }
  }
  const text = out.join("\n") + "\n";
  if (process.env.PXL_UPDATE || !existsSync(SNAP)) writeFileSync(SNAP, text);
  assert.equal(text, readFileSync(SNAP, "utf8"));
});
