// Strips types from src/**/*.ts into dist/**/*.js so the CLI also runs from node_modules
// (Node refuses to type-strip files there). No dependencies; runs on `npm install`/`npm pack`.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

process.removeAllListeners("warning");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const out = join(dist, relative(src, p));
    if (e.isDirectory()) walk(p);
    else if (dir.endsWith("viewer")) {
      // The viewer is served as-is; the server type-strips app.ts on request.
      mkdirSync(dirname(out), { recursive: true });
      cpSync(p, out);
    } else if (e.name.endsWith(".ts")) {
      const code = stripTypeScriptTypes(readFileSync(p, "utf8"), { mode: "strip" })
        .replace(/(from\s+|import\s+|import\(\s*)(["'])(\.{1,2}\/[^"']+)\.ts\2/g, "$1$2$3.js$2");
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out.replace(/\.ts$/, ".js"), code);
    }
  }
}

walk(src);
console.log(`pxl: built ${relative(root, dist)}/`);
