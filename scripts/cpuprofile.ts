// Where the time went in any pxl command (or a test file): its CPU profile summed by function, the
// time spent in each one itself and with what it calls. To keep study, check and the tests fast: run
// the slow thing under node's profiler, then read the profile here.
//
//   node --cpu-prof --cpu-prof-dir=prof bin/pxl.js study clip.gif --no-out
//   node scripts/cpuprofile.ts prof [rows by itself] [rows with what it calls]
//
// `pxl build --profile` does this for one art file's build, naming the art file's own functions.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/cpuprofile.ts <folder of .cpuprofile files> [self rows] [total rows]"); process.exit(1); }
// the newest profile in the folder
const file = readdirSync(dir).filter((f) => f.endsWith(".cpuprofile")).map((f) => join(dir, f)).sort().pop();
if (!file) { console.error(`no .cpuprofile in ${dir}`); process.exit(1); }
const p = JSON.parse(readFileSync(file, "utf8")) as { nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; children?: number[] }[]; samples: number[]; timeDeltas: number[] };
const byId = new Map(p.nodes.map((n) => [n.id, n])), parent = new Map<number, number>();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map<number, number>();
p.samples.forEach((s, i) => self.set(s, (self.get(s) ?? 0) + (p.timeDeltas[i] ?? 0)));
const name = (id: number) => { const c = byId.get(id)!.callFrame; return `${c.functionName || "(anon)"} ${c.url.split("/").slice(-2).join("/")}:${c.lineNumber + 1}`; };
const selfBy = new Map<string, number>(), totalBy = new Map<string, number>();
for (const [id, t] of self) {
  selfBy.set(name(id), (selfBy.get(name(id)) ?? 0) + t);
  // a function counts once per sample however deep it recurses
  const seen = new Set<string>();
  for (let n: number | undefined = id; n !== undefined; n = parent.get(n)) { const k = name(n); if (!seen.has(k)) { seen.add(k); totalBy.set(k, (totalBy.get(k) ?? 0) + t); } }
}
const all = [...self.values()].reduce((a, b) => a + b, 0);
const top = (m: Map<string, number>, k: number) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, t]) => `${(t / 1000).toFixed(0).padStart(6)} ms ${((100 * t) / all).toFixed(1).padStart(5)}%  ${n}`).join("\n");
console.log(`BY ITSELF\n${top(selfBy, Number(process.argv[3] ?? 18))}\nWITH WHAT IT CALLS\n${top(totalBy, Number(process.argv[4] ?? 25))}`);
