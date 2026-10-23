#!/usr/bin/env node
// Entry point. In a checkout it runs the TypeScript sources directly (Node >= 22.18 strips types);
// installed under node_modules, where Node refuses to strip types, it runs the dist/ build.
// Hide Node's experimental warnings about type stripping so agent output stays clean.
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name !== "ExperimentalWarning") console.warn(w);
});

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`pxl needs Node >= 22.18 (found ${process.versions.node})`);
  process.exit(2);
}

// V8's compiled code kept on disk between runs (Node's own cache, in the temp folder): an agent runs
// pxl many times, and each start then skips stripping and compiling pxl's sources again
(await import("node:module")).enableCompileCache?.();
const installed = /\/node_modules\//.test(decodeURIComponent(import.meta.url));
const { main } = await import(installed ? "../dist/node/cli.js" : "../src/node/cli.ts");
process.exitCode = await main(process.argv.slice(2));
