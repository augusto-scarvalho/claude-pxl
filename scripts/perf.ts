// How long `pxl check` takes on each example (or the files given), and its peak memory: run it before
// and after a change to the engine. It caught the build cache going from 2.7 GB on a long city loop
// to the sunset's check taking 100 s instead of 14 when the cache was capped by count.
//
//   node scripts/perf.ts                     every example, slowest first
//   node scripts/perf.ts examples/sunset/sunset.px.js
//
// Each file runs in a process of its own, so one file's memory doesn't count toward the next.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repo = resolve(import.meta.dirname, "..");
const one = process.argv[2] === "--one";
if (one) {
  const { loadProject } = await import(pathToFileURL(join(repo, "src/node/load.ts")).href);
  const { checkProject } = await import(pathToFileURL(join(repo, "src/node/check.ts")).href);
  let peak = 0;
  const tick = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 50);
  const t0 = Date.now(), file = process.argv[3];
  const r = checkProject(loadProject(file, { checksOnly: true }), { file: basename(file) });
  clearInterval(tick);
  peak = Math.max(peak, process.memoryUsage().rss);
  console.log(JSON.stringify({ s: (Date.now() - t0) / 1000, mb: Math.round(peak / 1e6), checked: r.checked }));
} else {
  const ex = join(repo, "examples");
  const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => resolve(f))
    : (readdirSync(ex, { recursive: true }) as string[]).map((f) => join(ex, f))
      .filter((f) => f.endsWith(".px.js") && !f.split(/[\\/]/).some((s) => s.startsWith("_") || s === "out") && !/[\\/]pipeline[\\/]part_/.test(f));
  const rows: { s: number; mb: number; f: string }[] = [];
  for (const f of files) {
    try {
      const out = execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", import.meta.filename, "--one", f], { encoding: "utf8", maxBuffer: 1 << 24 });
      rows.push({ ...JSON.parse(out.trim().split("\n").pop()!), f: relative(ex, f) });
    } catch { rows.push({ s: NaN, mb: NaN, f: relative(ex, f) + " (failed)" }); }
  }
  rows.sort((a, b) => b.s - a.s);
  for (const r of rows) console.log(`${r.s.toFixed(1).padStart(6)} s ${String(r.mb).padStart(6)} MB  ${r.f}`);
  console.log(`total ${rows.reduce((t, r) => t + (r.s || 0), 0).toFixed(0)} s over ${rows.length} files`);
}
