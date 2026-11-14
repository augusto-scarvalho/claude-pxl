// pxl build --profile: where a build spends its time, read off V8's own sampling profiler (what the
// extinction scene needed when it went from 17 s to 1m43s and nobody could see why). The functions
// that spent the most time themselves: first those in the art files (what you can make faster:
// a march, a sky worked out again every frame), then pxl's own; and the slowest assets. Then the traced
// fields whose march isn't kept between builds, a function in them not pure() (surface.ts's kept.left,
// set only while this runs: without it no march is timed), those whose march is kept and their paint not, a paint
// function not pure, what making pure functions took against what reading their paint back saved (pure.ts's
// pureSaid, store.ts's paintSaid: counted always, a few additions), and how many threads marched (threads.ts).
import { readFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { basename, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { notPure } from "../core/sdf.ts";
import { kept } from "../core/surface.ts";
import { pureSaid } from "./pure.ts";
import { DISK_MS, paintSaid } from "./store.ts";
import { threadsSaid } from "./threads.ts";
import { workersSaid } from "./workers.ts";

interface Node { id: number; callFrame: { functionName: string; url: string; lineNumber: number } }
interface CpuProfile { nodes: Node[]; samples: number[]; timeDeltas: number[] }
/** A field traced again at every build (`paint`: painted again): the functions in it that aren't pure, who drew it, its traces, their march or paint (ms in all, the longest). */
export interface Left { fns: { part: string; what: string; src: string }[]; who: string[]; n: number; ms: number; max: number; paint?: boolean }

/** Run `fn` under the CPU profiler; its result, the profile, and the fields traced that can't be kept. */
export async function profiled<T>(fn: () => T): Promise<{ result: T; profile: CpuProfile; left: Left[] }> {
  const s = new Session(), left = new Map<string, Left>();
  Object.assign(pureSaid, { made: 0, shared: 0, ms: 0 }); Object.assign(paintSaid, { back: 0, saved: 0, under: 0, underMs: 0 });
  // (each trace of such a field, by the functions in its way: one move's frames, or a figure's every move)
  kept.left = (who, field, ms, paint) => {
    const fns = [...new Map(notPure(field, "", [], paint).map(({ part, what, fn }) => { const f = { part, what, src: Function.prototype.toString.call(fn) }; return [JSON.stringify(f), f]; })).values()];
    const k = `${paint ? "paint " : ""}${JSON.stringify(fns)}`, e = left.get(k) ?? left.set(k, { fns, who: [], n: 0, ms: 0, max: 0, paint }).get(k)!;
    if (!e.who.includes(who)) e.who.push(who);
    e.n++; e.ms += ms; e.max = Math.max(e.max, ms);
  };
  s.connect();
  try {
    await s.post("Profiler.enable");
    await s.post("Profiler.setSamplingInterval", { interval: 500 });
    await s.post("Profiler.start");
    const result = fn();
    const { profile } = (await s.post("Profiler.stop")) as { profile: CpuProfile };
    return { result, profile, left: [...left.values()] };
  } finally {
    kept.left = undefined;
    s.disconnect();
  }
}

/** The report: self time by function, the art files' first, then pxl's; `times`: ms per asset; `left`: the fields traced but not kept. */
export function profileReport(profile: CpuProfile, art: string[], times: [string, number][], left: Left[] = [], top = 10): string {
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
    threadsSaid(),
    workersSaid(),
    "time spent in each function itself, in the art files (what to make faster):",
    ...(artRows.length ? artRows : ["  (none worth naming)"]),
    "and in pxl:",
    ...(pxlRows.length ? pxlRows : ["  (none worth naming)"]),
    ...notKept(left.filter((e) => !e.paint), art, fmt),
    ...notKept(left.filter((e) => e.paint), art, fmt, true),
    ...pureCost(),
  ].join("\n");
}

/**
 * What making pure functions took in this thread, against what reading their paint back saved (the ms its making had
 * taken) and the draws painted under the store's floor (nothing of theirs kept): when there is paint to tell of or the
 * making took 0.1 s; and when, on a build that read paint back, making took more than that saved, what to do.
 */
function pureCost(): string[] {
  const { made, shared, ms } = pureSaid, { back, saved, under, underMs } = paintSaid, s = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  if (!back && !under && ms < 100) return [];
  const out = [`pure functions: ${made} made, ${shared} given back made already (the same source and data), ${s(ms)} in all; their paint read back at ${back} draw${back === 1 ? "" : "s"}, ${s(saved)} of painting saved${under ? `; ${under} draw${under === 1 ? "" : "s"} painted under ${DISK_MS} ms, nothing of theirs kept (${s(underMs)})` : ""}`];
  if (back && ms > saved) out.push("  making them took more than reading their paint back saved: make a pure function once, at the file's top or once a frame, not once a part (pxl help pure)");
  return out;
}

/** The fields traced again at every build (`paint`: painted again), the slowest first (a handful; none whose every trace is under the store's floor, kept or not). */
function notKept(left: Left[], art: string[], fmt: (ms: number) => string, paint = false): string[] {
  const rows = left.filter((e) => e.max >= DISK_MS).sort((a, b) => b.ms - a.ms);
  if (!rows.length) return [];
  // a function: where in the art files its source is, and its start
  const texts = new Map<string, string>(), code = art.filter((f) => /\.[cm]?[jt]s$/.test(f));
  const where = (src: string) => {
    for (const f of code) {
      if (!texts.has(f)) try { texts.set(f, readFileSync(f, "utf8")); } catch { texts.set(f, ""); }
      const i = texts.get(f)!.indexOf(src);
      if (i >= 0) return `${basename(f)}:${texts.get(f)!.slice(0, i).split("\n").length} `;
    }
    return "";
  };
  const start = (src: string) => { const s = src.replace(/\s+/g, " "); return s.length > 44 ? `${s.slice(0, 44)}...` : s; };
  const out = [paint ? "painted again at every build, its trace kept: a paint function in the field isn't pure (the slowest first):" : "traced again at every build, not kept: a function in the field isn't pure (the slowest first):"];
  for (const e of rows.slice(0, 5)) {
    out.push(`  ${fmt(e.ms)} ${String(e.n).padStart(4)} trace${e.n > 1 ? "s" : " "}  ${e.who.slice(0, 2).join(", ")}${e.who.length > 2 ? ` and ${e.who.length - 2} more` : ""}`);
    for (const f of e.fns.slice(0, 6)) out.push(`      ${f.what}${f.part ? ` (part ${f.part})` : ""}: ${where(f.src)}${start(f.src)}`);
    if (e.fns.length > 6) out.push(`      and ${e.fns.length - 6} more`);
  }
  if (rows.length > 5) out.push(`  and ${rows.length - 5} more field${rows.length > 6 ? "s" : ""}, ${fmt(rows.slice(5).reduce((s, e) => s + e.ms, 0)).trim()}`);
  out.push(`  give such a function as pure({ name: value, ... }, fn) and what ${paint ? "it paints" : "its traces find"} is kept on disk: pxl help pure`);
  return out;
}
