// Whole builds made by worker threads, for pxl check and pxl build of a file. Each worker loads the project once and
// takes the builds this thread hands out (Project.handOut: an anim's frames, when one other than 0 is asked or timeline()
// reads them all, and the first frames of what a check or a build goes through; never a scene's frame, whose code may
// carry another build's work in a memo of its own, as the round's bout does), each claimed by one thread in memory they
// share. A worker makes all of a build's work (the art's code, the march on one thread, the paint) and sends it back
// only as the store would keep it (store.ts): made where the project keeps to the files (no Math.random, clock or late
// read before it), its log holding every warning said before it began, every field writable as data. This thread goes
// through the file in today's order and finds it made as a disk hit is (its log's warnings given again where it would
// have been made, its options and warnings joined to the builds around it), only where it would be the same as made
// here: each build at time 0 the worker's build asked is held here already, or sent with it (made inside it: then held,
// as made here); a frame 0 the worker only read a timeline from (as its definition gives it, not made) is held here, and
// its log joins the build's, as found here. Else (and for a build no worker has taken, one not made there, one that
// threw there) it is made here, so an error is today's, at the same place. How many: threads.ts's record; workers
// that lose to one thread by its measure are stopped, and everything after is made here, as when a worker is gone.
import { freemem } from "node:os";
import { MessageChannel, type MessagePort, Worker, isMainThread, parentPort, receiveMessageOnPort, workerData } from "node:worker_threads";
import type { BuildOut } from "../core/build.ts";
import type { DiskLog, Kept, Project, ProjectOptions } from "../core/project.ts";
import { kept } from "../core/surface.ts";
import { loadProject } from "./load.ts";
import { decode, encode, sha1 } from "./store.ts";
import { crowd, guess, workersFor, workersSaw } from "./threads.ts";

// (the traces this thread asked the store for, read back or not: a build that read most of its own back was made
// warm, at a fraction of its cold ms, and is weighed only against warm ones; --no-cache reads none)
const traces = { read: 0, made: 0 }, asked = kept.trace;
if (asked) kept.trace = (k, r) => { const o = asked(k, r); if (o?.t) traces.read++; else if (o) traces.made++; return o; };
const warmSince = (s: { read: number; made: number }) => traces.read - s.read > traces.made - s.made;
// (where the guess is 3 or more: the ladder of a machine guessing 2 keeps its ms by name alone)
const named = (name: string, warm: boolean) => (warm && guess() > 2 ? `${name} warm` : name);

const MAX = 1 << 16;
// (a job's state: free, a worker's, this thread's, made and posted, not made there)
const FREE = 0, THEIRS = 1, MINE = 2, MADE = 3, NOT = 4;
/** What a worker keeps of its builds at times other than 0 (a project keeps 1 GiB): its jobs' inner builds. */
const KEEP = 256 * 2 ** 20;
const keyOf = (name: string, seed: number, t: number) => (seed === 0 ? name : `${name}@${seed}`) + (t ? `#${t}` : "");
type Coded = { v: unknown; bufs: ArrayBuffer[]; log: DiskLog };
type Msg = { key: string; ms: number; made?: Coded & { need: string[]; skipped: string[] }; zeros: [string, Coded][]; tr: [number, number] };
const code = (h: Kept): Coded => { const bufs: ArrayBufferView[] = [], v = encode(h.out, bufs); return { v, bufs: bufs.map((b) => b.buffer as ArrayBuffer), log: h.log }; };
const uncode = (c: Coded): Kept => ({ out: decode(c.v, c.bufs) as BuildOut, log: c.log });

/**
 * What the workers did in this process: how many and why, builds handed out, made there, served, made here instead, not
 * served, ms waited; what its work would have taken on one thread, by threads.ts's measure (0: not judged), what it
 * took, and when they were stopped for losing (ms after they began).
 */
export const stats = { n: 1, why: "", jobs: 0, made: 0, served: 0, here: 0, refused: 0, waited: 0, est: 0, ms: 0, cut: 0 };
/** Workers that ran CUT ms and did a fifth less than one thread would have at the least are stopped, the rest made here. */
const CUT = 30_000;
// (the command before's workers stopped and its measure written when another starts in this process, or at its exit)
let stop: (() => void) | undefined, done: (() => void) | undefined, hooked = false, refused = () => 0;

/** Workers for `cmd` on p, loaded from `file` with `opts` (none: PXL_WORKERS=1, or measured so; then today's path exactly). */
export function startWorkers(p: Project, file: string, opts: ProjectOptions, cmd: "check" | "build"): void {
  stop?.();
  done?.();
  stop = done = undefined;
  refused = () => p.refused;
  // (its time: the process's for its first command, which loaded the project in it; from here for a later one)
  const t0 = hooked ? performance.now() : 0;
  if (!hooked) { hooked = true; process.on("exit", () => done?.()); }
  if (p.early) return;
  const id = sha1(`${cmd}\0${file}`), pick = workersFor(id);
  if (pick.alone) crowd();
  // never more than the free memory holds: each worker the project as loaded here and the builds it keeps
  const each = process.memoryUsage().heapUsed + KEEP, room = Math.floor((freemem() - 2 ** 30) / each);
  let n = pick.n, why = pick.why;
  if (n > 1 && n > room) { n = Math.max(1, room); why += `; ${n} for the free memory (${Math.round(freemem() / 2 ** 20)} MiB, ${Math.round(each / 2 ** 20)} MiB a worker)`; }
  Object.assign(stats, { n, why, jobs: 0, made: 0, served: 0, here: 0, refused: 0, waited: 0, est: 0, ms: 0, cut: 0 });
  if (n < 2 && !pick.measure) return;
  const sab = new SharedArrayBuffer(4 * (MAX + 1)), st = new Int32Array(sab), ports: MessagePort[] = [], ws: Worker[] = [];
  const jobs = new Map<string, [number, string]>(), list: [string, string, number, number, number][] = [], got = new Map<string, Msg>(), zeros = new Map<string, Coded>();
  // (this run's work at one thread's ms: each name's, measured here on one thread; the workers' ms of those served; the
  // builds handed out it made itself while they ran, at that ms, else at theirs)
  const cost: Record<string, [number, number]> = {}, did = { known: 0, theirs: 0, unknown: 0, ours: 0 };
  // (the traces read back and made by this command, here from now on and in the workers' builds served; each build's
  // here from when it was asked)
  const from = { ...traces }, theirs = { read: 0, made: 0 }, asks = new Map<string, typeof traces>();
  let broken = false, t1 = 0, t2 = 0;
  const used = new Set<string>();
  // (the builds served at each name's ms on one thread, the others at the workers' ms slowed as those were)
  const slow = () => (did.known ? Math.max(1, did.theirs / did.known) : 1), served = () => did.known + did.unknown / slow();
  // (the least its work so far would have taken on one thread: this thread's own time while they ran slowed as theirs,
  // which is more than its encoding and writing slow)
  const least = (now: number) => { const busy = now - t1 - stats.waited; return now - t0 - stats.waited - busy + busy / slow() + served(); };
  const begin = () => {
    t1 = performance.now();
    for (let k = 0; k < n; k++) {
      const { port1, port2 } = new MessageChannel();
      const w = new Worker(new URL(import.meta.url), { workerData: { pxlBuilds: true, file, opts, sab, port: port2 }, transferList: [port2] });
      w.on("error", () => {}).unref();
      port1.unref();
      if (list.length) w.postMessage(list);
      ws.push(w); ports.push(port1);
    }
    crowd();
  };
  stop = () => { for (const w of ws) void w.terminate(); };
  const drain = () => { for (const pt of ports) for (let m = receiveMessageOnPort(pt); m; m = receiveMessageOnPort(pt)) { const g = m.message as Msg; got.set(g.key, g); if (g.made) stats.made++; for (const [k, z] of g.zeros) zeros.set(k, z); } };
  p.elsewhere = {
    isJob: (key) => jobs.has(key),
    ahead: (add) => {
      const fresh: typeof list = [];
      for (const [name, seed, t] of add) {
        const key = keyOf(name, seed, t);
        if (jobs.has(key) || jobs.size >= MAX) continue;
        jobs.set(key, [jobs.size, name]);
        fresh.push([key, name, seed, t, jobs.size - 1]);
      }
      list.push(...fresh);
      stats.jobs = jobs.size;
      if (fresh.length) for (const w of ws) w.postMessage(fresh);
    },
    built: (key, ms) => {
      const s = asks.get(key), name = named(jobs.get(key)![1], !!s && warmSince(s)), k = pick.cost[name];
      asks.delete(key);
      if (n < 2) { const e = (cost[name] ??= [0, 0]); e[0] += ms; e[1]++; } else did.ours += k ? k[0] / k[1] : ms;
    },
    zero: (k) => { const z = zeros.get(k); zeros.delete(k); return z && uncode(z); },
    get: (key) => {
      const j = jobs.get(key), now = performance.now();
      // (losing by a fifth at the least, where the number is a guess corrected: everything made here from now on, the
      // workers stopped)
      if (t1 && !t2 && now - t1 > CUT && did.known && guess() > 2 && least(now) < 0.8 * (now - t0)) { t2 = now; stats.cut = now - t1; broken = true; stop!(); }
      if (j) asks.set(key, { ...traces });
      // (one served already and asked again, dropped from memory here since: made here, as then)
      if (!j || n < 2 || broken || used.has(key)) return undefined;
      // (else at the first build handed out not found on disk)
      if (!ws.length) begin();
      const s = 1 + j[0];
      // (free: this thread's from now on; and one it took before, dropped from memory since and asked again: no
      // worker will ever make it)
      const was = Atomics.compareExchange(st, s, FREE, MINE);
      if (was === FREE || was === MINE) { stats.here++; return undefined; }
      const w0 = performance.now();
      try {
        for (;;) {
          const c = Atomics.load(st, 0), now = Atomics.load(st, s);
          if (now === NOT) { stats.here++; return undefined; }
          if (now === MADE) {
            drain();
            const m = got.get(key);
            if (m) {
              got.delete(key);
              used.add(key);
              const known = pick.cost[named(j[1], m.tr[0] > m.tr[1])];
              if (known) { did.known += known[0] / known[1]; did.theirs += m.ms; } else did.unknown += m.ms;
              theirs.read += m.tr[0]; theirs.made += m.tr[1]; asks.delete(key);
              stats.served++;
              for (const k of m.made!.need) if (p.held(k)) zeros.delete(k);
              return { ...uncode(m.made!), need: m.made!.need, skipped: m.made!.skipped };
            }
          }
          // (a worker gone, or stuck five minutes on one build: everything made here from now on)
          Atomics.wait(st, 0, c, now === MADE ? 1 : 1000);
          if (performance.now() - w0 > 300_000) { broken = true; stats.here++; return undefined; }
        }
      } finally { stats.waited += performance.now() - w0; }
    },
  };
  // (with the store off every build is made: they start at once)
  if (n > 1 && !p.disk) begin();
  done = () => {
    stats.refused = p.refused;
    if (!pick.measure) return;
    const ms = (stats.ms = performance.now() - t0), warm = traces.read - from.read + theirs.read > traces.made - from.made + theirs.made;
    if (n < 2) { const work = Object.values(cost).reduce((a, [m]) => a + m, 0); workersSaw(id, n, { work, est: ms, ms, warm, cost: work >= 10_000 ? cost : undefined }); return; }
    // (est, for the ladder: this thread's own time slowed as much as the workers' builds were)
    stats.est = workersSaw(id, n, { work: served() + did.ours, est: (ms - stats.waited) / slow() + served(), ms, warm, known: did.known, cut: stats.cut });
  };
}

/** A line for pxl build --profile: how many workers made builds and why. */
export function workersSaid(): string {
  if (stats.n < 2) return `builds made on this thread alone${stats.why ? `: ${stats.why}` : ""}`;
  return `builds made by ${stats.n} workers: ${stats.why} (${stats.served} of ${stats.jobs} handed out served, ${stats.here} made here, ${refused()} made there not served, ${(stats.waited / 1000).toFixed(1)} s waited; their time isn't in this profile)${stats.cut ? `; stopped after ${(stats.cut / 1000).toFixed(0)} s, slower than one thread` : ""}`;
}

if (!isMainThread && workerData?.pxlBuilds) {
  const { file, opts, sab, port } = workerData as { file: string; opts: ProjectOptions; sab: SharedArrayBuffer; port: MessagePort };
  const st = new Int32Array(sab), p = loadProject(file, { ...opts, timedBytes: KEEP }), real = p.disk;
  // (the builds kept to the store's conditions that may be sent: the jobs', and every one at time 0, which a job asks
  // as an inner build and this thread then holds; those sent once from here)
  const kept = new Map<string, Kept>(), want = new Set<string>(), sent = new Set<string>();
  const keep = (k: string, h: Kept) => { if (want.has(k) || !/[# ]/.test(k)) kept.set(k, h); };
  p.skipped = new Set();
  p.touched = new Set();
  if (!p.early) p.disk = {
    get: (k, o) => { const h = real?.get(k, o); if (h) keep(k, h); return h; },
    put: (k, out, log, ms) => { keep(k, { out, log }); real?.put(k, out, log, ms); },
  };
  const list: [string, string, number, number, number][] = [];
  let at = 0;
  parentPort!.on("message", (add: typeof list) => {
    list.push(...add);
    for (const j of add) want.add(j[0]);
    for (; at < list.length; at++) {
      const [key, name, seed, t, i] = list[at];
      if (Atomics.compareExchange(st, 1 + i, FREE, THEIRS) !== FREE) continue;
      const t0 = performance.now(), msg: Msg = { key, ms: 0, zeros: [], tr: [0, 0] }, was = { ...traces };
      try {
        p.skipped!.clear();
        p.touched!.clear();
        p.build(name, seed, t, false);
        const r = kept.get(key);
        if (r && p.disk) {
          sent.add(key);
          const need = [...p.touched!].filter((k) => k !== key);
          msg.made = { ...code(r), need: [...new Set([...need, ...p.skipped!])], skipped: [...p.skipped!] };
          for (const k of need) if (!sent.has(k) && kept.has(k)) { try { msg.zeros.push([k, code(kept.get(k)!)]); sent.add(k); } catch { /* not writable as data: held there, or made there */ } }
        }
      } catch { msg.made = undefined; /* made where it is asked: the same error there */ }
      if (!want.has(key) || key.includes("#")) kept.delete(key);
      msg.ms = performance.now() - t0;
      msg.tr = [traces.read - was.read, traces.made - was.made];
      port.postMessage(msg);
      Atomics.store(st, 1 + i, msg.made ? MADE : NOT);
      Atomics.add(st, 0, 1);
      Atomics.notify(st, 0);
    }
  });
}
