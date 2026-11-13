// A pure field's march on more threads (surface.ts's spread). A field whose every function is pure() is its code, its
// numbers and functions that are a source text and data (sdf.ts's HOW): each thread makes it again of those (code
// compiled once a shape, as here) and marches the runs of the trace's rays it takes, writing each ray's hit into memory
// they share, while this thread takes runs too, of a copy made the same way (the art's own functions are not called, so
// their data stays as it was). The same JavaScript marches each ray, so the same floats; and a ray's hit is a function of
// that ray alone (the march reads the field's distance and nothing else, and the memos and noise tables the field's code
// writes are caches of numbers it works out the same either way), so it is the same in any order or grouping. A field
// that can't cross whole, a pure function's data changed (before, or by the march in a thread), a thread that throws:
// the trace is marched here as always, so an error is the same error at the same place. Inside a worker thread (the
// tests' own) a march takes no more. The threads start at the first trace that takes them and are kept for the process,
// holding it open no longer than it would be.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { availableParallelism, cpus } from "node:os";
import { dirname, join } from "node:path";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { sweepDist } from "../core/rig3d.ts";
import { type Compiled, HOW, INTACT, STILL, Sdf, compile, made } from "../core/sdf.ts";
import { marchOf, spread } from "../core/surface.ts";
import { pureOf } from "./pure.ts";
import { DIR, sha1 } from "./store.ts";

/** A field's distance as data: its code, its numbers, how each function it calls is made, which memo each it writes is. */
interface Code { src: string; K: number[]; F: unknown[]; M: number[] }
const CANT = new Error("can't cross"), RUN = 64;
// (the shared counters: the next ray not taken, the threads that took this trace, those done, one failed)
const NEXT = 0, IN = 1, DONE = 2, FAIL = 3;

/** C's distance as data another thread makes again (CANT: a function in it HOW hasn't). */
function recipe(C: Compiled): Code {
  const memos = new Map<Float64Array, number>(), seen = new Map<object, unknown>();
  const memo = (m: Float64Array) => memos.get(m) ?? (memos.set(m, memos.size), memos.size - 1);
  const code = (c: Compiled["code"]): Code => ({ src: c.src, K: c.K, F: c.F.map(fn), M: c.M.map(memo) });
  const once = (o: object, f: () => unknown) => { if (!seen.has(o)) seen.set(o, f()); return seen.get(o); };
  const fn = (f: object): unknown => once(f, () => {
    const h = HOW.get(f) as { src?: string; names: string[]; values: unknown[]; sweep?: number[]; fns: unknown[] } | undefined;
    if (h?.src !== undefined) return { p: h.src, n: h.names, v: h.values.map(val) };
    if (h?.sweep) return { s: h.sweep, f: h.fns.map((g) => (g === undefined ? null : fn(g as object))) };
    throw CANT;
  });
  const val = (v: unknown): unknown => {
    if (v === null || (typeof v !== "object" && typeof v !== "function")) return v;
    const h = HOW.get(v);
    // (a field in its data: its distance at its still moment, and the memo the code drawing it writes)
    if (h instanceof Sdf) return once(v, () => { const c = compile(h, STILL); return { s: code(c.code), lo: c.lo, hi: c.hi, m: h.memo ? memo(h.memo) : -1 }; });
    if (typeof v === "function") return { f: fn(v) };
    if (Array.isArray(v)) return { a: v.map(val) };
    return { o: Object.keys(v).map((k) => [k, val((v as Record<string, unknown>)[k])]) };
  };
  return code(C.code);
}

/** A field's distance made again of its recipe, and the check that the pure functions made hold their data as given. */
function rebuild(r: Code): { d: (x: number, y: number, z: number) => number; check: () => string | undefined } {
  const memos: Float64Array[] = [], made2 = new Map<unknown, unknown>(), all: object[] = [];
  const memo = (i: number) => (memos[i] ??= new Float64Array([NaN, NaN, NaN, NaN]));
  const code = (c: Code) => made(c.src, c.K, c.F.map(fn) as ((x: number, y: number, z: number) => number)[], c.M.map(memo));
  const once = <T>(o: unknown, f: () => T): T => { if (!made2.has(o)) made2.set(o, f()); return made2.get(o) as T; };
  const fn = (h: any): unknown => once(h, () => {
    if (h.p === undefined) return sweepDist(h.s, fn(h.f[0]) as never, h.f[1] ? fn(h.f[1]) as never : undefined, h.f[2] ? fn(h.f[2]) as never : undefined);
    const f = pureOf(Object.fromEntries((h.n as string[]).map((k, i) => [k, val(h.v[i])])), h.p);
    all.push(f);
    return f;
  });
  // (a field in a pure function's data: one given by that distance, its memo the one the code writes)
  const val = (v: any): unknown => v === null || typeof v !== "object" ? v : "a" in v ? v.a.map(val) : "o" in v ? Object.fromEntries(v.o.map(([k, x]: [string, unknown]) => [k, val(x)]))
    : "f" in v ? fn(v.f) : once(v, () => { const s = new Sdf({ op: "fn", d: code(v.s), lo: v.lo, hi: v.hi, lip: 1, id: 0 }); if (v.m >= 0) s.memo = memo(v.m); return s; });
  return { d: code(r), check: () => { for (const f of all) { const e = INTACT.get(f)!(); if (e) return e; } return undefined; } };
}

/** Runs of the rays marched until none is left (or a thread failed), then its data checked; `busy[w]` the ms it marched. */
function run(F: ReturnType<typeof rebuild>, lip: number, R: Float64Array, t: Float64Array, ctl: Int32Array, busy: Float64Array, w: number): void {
  const march = marchOf(F.d, lip), n = t.length, m0 = performance.now();
  try {
    for (let i0 = Atomics.add(ctl, NEXT, RUN); i0 < n && !Atomics.load(ctl, FAIL); i0 = Atomics.add(ctl, NEXT, RUN))
      for (let i = i0, e = Math.min(n, i0 + RUN); i < e; i++) { const j = 9 * i; t[i] = march(R[j], R[j + 1], R[j + 2], R[j + 3], R[j + 4], R[j + 5], R[j + 6], R[j + 7], R[j + 8]); }
    if (F.check()) Atomics.store(ctl, FAIL, 1);
  } catch { Atomics.store(ctl, FAIL, 1); }
  busy[w] = performance.now() - m0;
}

interface Job { r: Code; lip: number; sab: SharedArrayBuffer; ctl: SharedArrayBuffer; busy: SharedArrayBuffer; w: number; n: number }
const views = (j: Job) => [new Float64Array(j.sab, 0, 9 * j.n), new Float64Array(j.sab, 72 * j.n, j.n), new Int32Array(j.ctl), new Float64Array(j.busy)] as const;

if (!isMainThread && workerData?.pxlMarch) {
  parentPort!.on("message", (j: Job) => {
    const [R, t, ctl, busy] = views(j);
    Atomics.add(ctl, IN, 1);
    try { if (Atomics.load(ctl, NEXT) < j.n) run(rebuild(j.r), j.lip, R, t, ctl, busy, j.w); } catch { Atomics.store(ctl, FAIL, 1); }
    finally { Atomics.add(ctl, DONE, 1); Atomics.notify(ctl, DONE); }
  });
}

// ---------------------------------------------------------------- this thread's side
const pool: Worker[] = [];
let broken = false;
/** This process's big pure traces: asked how many threads, marched on more, marched here after the threads couldn't. */
export const stats = { asked: 0, spread: 0, here: 0 };

spread.threads = threads;
/** Workers are making builds (workers.ts): they hold the cores, so a march here takes no more threads. */
let crowded = false;
export const crowd = () => { crowded = true; };
spread.march = (P, rays) => {
  const k = crowded ? 0 : spread.threads!() - 1;
  if (broken || k < 1 || P.C.intact()) return undefined;
  let r: Code;
  try { r = recipe(P.C); } catch (e) { if (e === CANT) return undefined; throw e; }
  while (pool.length < k) {
    const w = new Worker(new URL(import.meta.url), { workerData: { pxlMarch: true } });
    w.on("error", () => {}).unref();
    pool.push(w);
  }
  const len = rays.length / 9, j: Job = { r, lip: P.lip, sab: new SharedArrayBuffer(80 * len), ctl: new SharedArrayBuffer(16), busy: new SharedArrayBuffer(8 * (k + 1)), w: 0, n: len };
  const [R, t, ctl, busy] = views(j);
  R.set(rays);
  for (let w = 0; w < k; w++) pool[w].postMessage({ ...j, w: w + 1 });
  try { run(rebuild(r), P.lip, R, t, ctl, busy, 0); } catch { Atomics.store(ctl, FAIL, 1); }
  // (the threads that took a run; one not started yet takes none)
  for (let i = Atomics.load(ctl, IN), d = Atomics.load(ctl, DONE); d !== i; i = Atomics.load(ctl, IN), d = Atomics.load(ctl, DONE))
    if (Atomics.wait(ctl, DONE, d, 60_000) === "timed-out") { broken = true; stats.here++; return undefined; }
  if (Atomics.load(ctl, FAIL)) { stats.here++; return undefined; }
  stats.spread++;
  return { t: t.slice(), ms: busy.reduce((a, b) => a + b, 0) };
};

// ---------------------------------------------------------------- how many: measured on this machine
// Never read off a table of processors. While the number is unsettled, each command marches on one of two, the best so
// far and twice it (the one measured less), and each big pure trace is timed whole, its march and its paint (a machine
// that heats under more threads slows both, and a short trial would miss it); at the command's end its times join a
// record beside the builds. Once each has a minute of traces of the same fields (a field's code, its shape: the frames
// of a figure share it), twice the best becomes the best if it did the same work at least GAIN times as fast, and the
// next is tried; else the best is settled, and from then on nothing is timed or written. Measured again when Node or
// the processor change, or after AGE.
const GAIN = 1.15, ENOUGH = 60_000, AGE = 30 * 86_400_000, FILE = join(dirname(DIR), "pxl-threads.json");
/** The record: whose (Node, the processor), since when, the number settled, or the two being measured and their traces' ms and cells by shape. */
interface Rec { key: string; at: number; n?: number; said?: string; best: number; next: number; runs: Record<number, Record<string, [number, number]>>; files?: Record<string, FileRec> }
let n: number | undefined, why = "", rec: Rec | undefined;
const mine = new Map<string, [number, number]>();

/** How many threads march a big pure trace: PXL_THREADS, 1 inside a worker thread (the tests' own), else measured. */
function threads(): number {
  stats.asked++;
  if (n !== undefined) return n;
  const f = process.env.PXL_THREADS;
  if (f !== undefined && /^\d+$/.test(f) && +f >= 1) { why = `forced, PXL_THREADS=${f}`; return (n = +f); }
  if (!isMainThread) { why = "inside a worker thread, which takes no more"; return (n = 1); }
  // (the machine's, not pxl's sources': a laptop that settles on 1 doesn't pay the trial again at every change to pxl)
  const top = availableParallelism(), key = machine();
  rec = read(key) ?? { key, at: Date.now(), best: 1, next: Math.min(2, top), runs: {} };
  if (rec.n !== undefined || rec.next <= rec.best) { why = rec.said ?? "this machine runs one thread at a time"; return (n = rec.n ?? rec.best); }
  const ms = (k: number) => Object.values(rec!.runs[k] ?? {}).reduce((a, [m]) => a + m, 0), b = ms(rec.best), x = ms(rec.next);
  n = b <= x ? rec.best : rec.next;
  why = `being measured on this machine, ${rec.best} against ${rec.next} (${Math.round(b / 1000)} s and ${Math.round(x / 1000)} s of traces so far)${rec.said ? `; ${rec.said}` : ""}`;
  spread.timed = (P, cells, t) => { const e = mine.get(P.C.code.src) ?? mine.set(P.C.code.src, [0, 0]).get(P.C.code.src)!; e[0] += t; e[1] += cells; };
  process.on("exit", save);
  return n;
}

function read(key: string): Rec | undefined {
  try { const r = JSON.parse(readFileSync(FILE, "utf8")) as Rec; return r.key === key && Date.now() - r.at < AGE ? r : undefined; } catch { return undefined; }
}

/** This command's times into the record (read again: another command may have written since), and what they settle. */
function save(): void {
  const r = read(rec!.key) ?? rec!;
  if (crowded || !mine.size || r.n !== undefined || (n !== r.best && n !== r.next)) return;
  const runs = (r.runs[n] ??= {});
  for (const [src, [ms, cells]] of mine) { const e = (runs[sha1(src).slice(0, 12)] ??= [0, 0]); e[0] += ms; e[1] += cells; }
  // (what the best's rates make of the next's work, against what that work took)
  const B = r.runs[r.best] ?? {}, N = r.runs[r.next] ?? {}, both = Object.keys(N).filter((s) => B[s]);
  const msB = both.reduce((a, s) => a + B[s][0], 0), msN = both.reduce((a, s) => a + N[s][0], 0);
  if (msB >= ENOUGH && msN >= ENOUGH) {
    const gain = both.reduce((a, s) => a + (B[s][0] / B[s][1]) * N[s][1], 0) / msN, top = availableParallelism();
    r.said = `measured here, ${r.next} threads did ${r.best}'s work ${gain.toFixed(2)}x as fast (${Math.round(msN / 1000)} s of traces against ${Math.round(msB / 1000)} s; more pays from ${GAIN}x)`;
    if (gain >= GAIN && r.next < top) Object.assign(r, { best: r.next, next: Math.min(2 * r.next, top), runs: { [r.next]: N } });
    else Object.assign(r, { n: gain >= GAIN ? r.next : r.best, runs: {} });
  }
  write(r);
}

function write(r: Rec): void {
  try { const aside = `${FILE}.${process.pid}.tmp`; mkdirSync(dirname(FILE), { recursive: true }); writeFileSync(aside, JSON.stringify(r)); renameSync(aside, FILE); } catch { /* measured again by the next command */ }
}

// ---------------------------------------------------------------- how many workers: measured on this machine, file by file
// The same way, in the same record, but for each command on each file (`id`): what a check or a build has to hand out,
// and how much of it this thread does itself, are the file's (Haldor's 328 frames all at once; the round's bout reading
// one move's frames at a time, its scene frames here), and so is the gain. A command whose builds handed out took under
// MIN_WORK ms the last time it ran starts none. Else, while unsettled, each runs on the best so far or twice it (the
// one measured less) and adds what its work would have taken on one thread (its builds handed out at the ms each name's
// took on one thread, and this thread's own time, slowed as much as the workers' builds were) and what it took; once
// each has ENOUGH of work, twice the best becomes the best if it did the same work GAIN times as fast, else the best is
// settled. A run on one thread measures each name's ms.
const MIN_WORK = 10_000;
interface FileRec { best: number; next: number; n?: number; said?: string; work?: number; runs: Record<number, [number, number]>; cost: Record<string, [number, number]> }

/** How many workers make a command's builds: PXL_WORKERS, 1 inside a worker thread, else measured for this command on this file. */
export function workersFor(id: string): { n: number; why: string; measure: boolean; cost: Record<string, [number, number]> } {
  const f = process.env.PXL_WORKERS;
  if (!isMainThread) return { n: 1, why: "inside a worker thread, which starts none", measure: false, cost: {} };
  if (f !== undefined && /^\d+$/.test(f) && +f >= 1) return { n: +f, why: `forced, PXL_WORKERS=${f}`, measure: false, cost: {} };
  const r = read(machine()), F = r?.files?.[id];
  if (!F) return { n: 1, why: "this file's builds not measured yet", measure: true, cost: {} };
  if ((F.work ?? 0) < MIN_WORK) return { n: 1, why: `its builds handed out took ${Math.round((F.work ?? 0) / 1000)} s on one thread the last time, too few to share`, measure: true, cost: F.cost };
  // (settled: one thread costs nothing more; more keep their work measured, so a command with little to share starts none)
  if (F.n !== undefined || F.next <= F.best) return { n: F.n ?? F.best, why: F.said ?? "this machine makes one build at a time", measure: (F.n ?? F.best) > 1, cost: F.cost };
  const b = F.runs[F.best]?.[0] ?? 0, x = F.runs[F.next]?.[0] ?? 0;
  return { n: b <= x ? F.best : F.next, why: `being measured on this file, ${F.best} against ${F.next} workers (${Math.round(b / 1000)} s and ${Math.round(x / 1000)} s of work so far)${F.said ? `; ${F.said}` : ""}`, measure: true, cost: F.cost };
}

/** What a command's run on `n` workers did (work: its builds handed out at one thread's ms; est: all it did, at one thread's; ms: its time), and on one, each name's ms. */
export function workersSaw(id: string, n: number, run: { work: number; est: number; ms: number; cost?: Record<string, [number, number]> }): void {
  const key = machine(), r = read(key) ?? { key, at: Date.now(), best: 1, next: Math.min(2, availableParallelism()), runs: {} };
  // (a file with little to share is never written down)
  if (!r.files?.[id] && run.work < MIN_WORK) return;
  const F = ((r.files ??= {})[id] ??= { best: 1, next: Math.min(2, availableParallelism()), runs: {}, cost: {} });
  F.work = run.work;
  for (const [k, [ms, c]] of Object.entries(run.cost ?? {})) F.cost[k] = [ms, c];
  if (F.n === undefined && F.next > F.best && (n === F.best || n === F.next) && run.est > 0) {
    const e = (F.runs[n] ??= [0, 0]);
    e[0] += run.est; e[1] += run.ms;
    const B = F.runs[F.best], N = F.runs[F.next];
    if (B?.[0] >= ENOUGH && N?.[0] >= ENOUGH) {
      const gain = N[0] / N[1] / (B[0] / B[1]), top = availableParallelism();
      F.said = `measured here on this file, ${F.next} workers did ${F.best}'s work ${gain.toFixed(2)}x as fast (${Math.round(N[1] / 1000)} s against ${Math.round(B[1] / 1000)} s; more pays from ${GAIN}x)`;
      if (gain >= GAIN && F.next < top) Object.assign(F, { best: F.next, next: Math.min(2 * F.next, top), runs: { [F.next]: N } });
      else Object.assign(F, { n: gain >= GAIN ? F.next : F.best, runs: {} });
    }
  }
  write(r);
}

const machine = () => sha1(`${process.version} ${cpus()[0]?.model} ${availableParallelism()}`);

/** A line for pxl build --profile: how many threads marched and why. */
export function threadsSaid(): string {
  if (!stats.asked) return "marched on this thread alone: no field traced was pure() and big enough to spread (one with a plain closure in it never is)";
  return `marched on ${n} thread${n === 1 ? "" : "s"}: ${why}${n! > 1 ? ` (the other ${n! - 1}'s march isn't in this profile)` : ""}`;
}
