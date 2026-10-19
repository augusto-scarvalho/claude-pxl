// pxl build --profile: where a build spends its time, read off V8's own sampling profiler (what the
// extinction scene needed when it went from 17 s to 1m43s and nobody could see why). The functions
// that spent the most time themselves: first those in the art files (what you can make faster:
// a march, a sky worked out again every frame), then pxl's own; and the slowest assets.
import { Session } from "node:inspector/promises";
import { basename, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

interface Node { id: number; callFrame: { functionName: string; url: string; lineNumber: number } }
interface CpuProfile { nodes: Node[]; samples: number[]; timeDeltas: number[] }

/** Run `fn` under the CPU profiler; its result and the profile. */
export async function profiled<T>(fn: () => T): Promise<{ result: T; profile: CpuProfile }> {
  const s = new Session();
  s.connect();
  try {
    await s.post("Profiler.enable");
    await s.post("Profiler.setSamplingInterval", { interval: 500 });
    await s.post("Profiler.start");
    const result = fn();
    const { profile } = (await s.post("Profiler.stop")) as { profile: CpuProfile };
    return { result, profile };
  } finally {
    s.disconnect();
  }
}

/** The report: self time by function, the art files' first, then pxl's; `times`: ms per asset. */
export function profileReport(profile: CpuProfile, art: string[], times: [string, number][], top = 10): string {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map<string, { ms: number; name: string; where: string; art: boolean }>();
  let total = 0;
  profile.samples.forEach((id, i) => {
    const ms = profile.timeDeltas[i] / 1000, n = byId.get(id);
    total += ms;
    if (!n) return;
    const { functionName, url, lineNumber } = n.callFrame;
    if (!url) return;                                           // (program), (garbage collector), (idle)
    const file = url.startsWith("file:") ? fileURLToPath(url) : url, isArt = art.some((a) => file === a);
    const where = isArt ? `${basename(file)}:${lineNumber + 1}` : relative(process.cwd(), file).split(sep).join("/") + `:${lineNumber + 1}`;
    const key = where + " " + functionName, e = self.get(key) ?? { ms: 0, name: functionName || "(anonymous)", where, art: isArt };
    e.ms += ms;
    self.set(key, e);
  });
  const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`).padStart(8);
  const pct = (ms: number) => `${Math.round((100 * ms) / (total || 1))}%`.padStart(4);
  const rows = (art: boolean) => [...self.values()].filter((e) => e.art === art).sort((a, b) => b.ms - a.ms).slice(0, top).filter((e) => e.ms >= 1)
    .map((e) => `  ${fmt(e.ms)} ${pct(e.ms)}  ${e.name.padEnd(18)} ${e.where}`);
  const slow = [...times].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, ms]) => `${n} ${fmt(ms).trim()}`).join(", ");
  const artRows = rows(true), pxlRows = rows(false);
  return [
    `profile: ${fmt(total).trim()} in all${slow ? `; slowest assets: ${slow}` : ""}`,
    "time spent in each function itself, in the art files (what to make faster):",
    ...(artRows.length ? artRows : ["  (none worth naming)"]),
    "and in pxl:",
    ...(pxlRows.length ? pxlRows : ["  (none worth naming)"]),
  ].join("\n");
}
