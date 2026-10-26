// How long `pxl check` takes on each example (or the files given), the processor time it burned (its
// threads summed: more than the time when it ran on several cores) and its peak memory: run it before
// and after a change to the engine. It caught the build cache going from 2.7 GB on a long city loop to
// the sunset's check taking 100 s instead of 14 when the cache was capped by count.
//
//   node scripts/perf.ts                     every example, slowest first
//   node scripts/perf.ts examples/sunset/sunset.px.js
//   node scripts/perf.ts --vs HEAD examples/hd2d/traveler.px.js --only "^tr_walk_"
//
// Each file runs in a process of its own, so one file's memory doesn't count toward the next.
// --vs <rev> times the files' frames built by the pxl at a git revision and by the working tree, in
// one process, frame by frame alternating (a laptop's speed drifts within seconds; two runs a minute
// apart differ more than most changes): of each animated asset, --frames N of its frames (8) spread over
// the loop, its frame 0 built first untimed (heads baked, caches filled); a still asset's frame 0.
// Three passes, each from a fresh load, after one that warms the JIT. --only <regex>: the assets whose
// name matches (a long scene's frames take a second each).
import { execFileSync } from "node:child_process";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { frameCount, frameTime } from "../src/node/shot.ts";
import { examples, inTree, loader, pick, repo, revTree } from "./vs.ts";

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(k); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const vs = opt("--vs");
if (args[0] === "--one") {
  const { loadProject } = await import(pathToFileURL(join(repo, "src/node/load.ts")).href);
  const { checkProject } = await import(pathToFileURL(join(repo, "src/node/check.ts")).href);
  const t0 = Date.now(), file = args[1];
  const r = checkProject(loadProject(file, { checksOnly: true }), { file: basename(file) }), u = process.resourceUsage();
  console.log(JSON.stringify({ s: (Date.now() - t0) / 1000, cpu: (u.userCPUTime + u.systemCPUTime) / 1e6, mb: Math.round((u.maxRSS * 1024) / 1e6), checked: r.checked }));
} else if (vs) {
  const only = new RegExp(opt("--only") ?? ""), cap = Number(opt("--frames") ?? 8), tree = revTree(vs);
  const load: Record<string, (f: string) => any> = { [vs]: await loader(tree), here: await loader(repo) };
  for (const f of args) {
    const at = (k: string) => k === "here" ? resolve(f) : inTree(tree, f), ms: Record<string, number> = { [vs]: 0, here: 0 };
    let jobs: [string, number][] | undefined, n = 0;
    for (let pass = -1; pass < 3; pass++) {
      const P = Object.fromEntries(Object.keys(load).map((k) => [k, load[k](at(k))]));
      // the same frames for both, read off the first pass's working tree (that pass isn't counted)
      jobs ??= (P.here.order as string[]).filter((a) => only.test(a)).flatMap((a) => {
        const c = frameCount(P.here, a);
        return c === 1 ? [[a, 0]] : pick(c, cap + 1).slice(1).map((i) => [a, frameTime(P.here, a, i)] as [string, number]);
      });
      for (const p of Object.values(P)) for (const [a, t] of jobs) if (t) p.timeline(a);
      jobs.forEach(([a, t], i) => {
        for (const k of i % 2 ? ["here", vs] : [vs, "here"]) { const t0 = performance.now(); P[k].image(a, 0, t); if (pass >= 0) ms[k] += performance.now() - t0; }
      });
      if (pass >= 0) n += jobs.length;
    }
    console.log(`${relative(repo, resolve(f)).split("\\").join("/")}: ${(ms[vs] / n).toFixed(2)} ms a frame at ${vs}, ${(ms.here / n).toFixed(2)} here (${(ms[vs] / ms.here).toFixed(2)}x as fast) over ${n / 3} frames`);
  }
} else {
  const files = args.length ? args.map((f) => resolve(f)) : examples().map((f) => join(repo, "examples", f));
  const rows: { s: number; cpu: number; mb: number; f: string }[] = [];
  for (const f of files) {
    const name = relative(join(repo, "examples"), f).split("\\").join("/");
    try {
      const out = execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", import.meta.filename, "--one", f], { encoding: "utf8", maxBuffer: 1 << 24 });
      rows.push({ ...JSON.parse(out.trim().split("\n").pop()!), f: name });
    } catch { rows.push({ s: NaN, cpu: NaN, mb: NaN, f: name + " (failed)" }); }
  }
  rows.sort((a, b) => b.s - a.s);
  for (const r of rows) console.log(`${r.s.toFixed(1).padStart(6)} s ${r.cpu.toFixed(1).padStart(6)} s cpu ${String(r.mb).padStart(6)} MB  ${r.f}`);
  console.log(`total ${rows.reduce((t, r) => t + (r.s || 0), 0).toFixed(0)} s (${rows.reduce((t, r) => t + (r.cpu || 0), 0).toFixed(0)} s cpu) over ${rows.length} files`);
}
