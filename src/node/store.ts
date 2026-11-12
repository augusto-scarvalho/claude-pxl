// Builds kept on disk between commands. A build is a function of what it reads: pxl's sources and Node's version (and
// the time zone and language), every file the project loaded (its text as run, its PNGs, palettes, poses), the
// asset's name, seed, time and clock, and the options it read on the way (pxl check's checksOnly, shot --world's whole
// world, a trace). Kept under a key of all of that, a build read back is the build, not a copy that can go stale: for
// art whose builds are each that function. A memo in the art file is covered below; a variable one build writes and
// another draws with is not (that build depends on the order it was made in, which no key holds). The
// options are in an entry's name (a check's build beside a shot's), with every option read earlier in the command by
// a build whose code ran, or found made while one's was running (art code may carry another build's pixels in a memo
// of its own), and it is served only where
// they are the same (a 3D figure's frame, which reads none, serves check and shot alike). Only a build whose own work
// took DISK_MS or more, and WORTH ms or more a MiB it takes, is kept (a figure's traced frame, not a thousand 2 ms
// sprites, nor a scene's frame composed of what is kept), only one whose every field can
// be written and read back as it was (a relation's functions, a mesh's sun map can't: such a build is made again), and
// none made after a warning its own log lacks (that memo again: the round's bout). Where builds stop being a function
// of the files, the project lets the disk go (load.ts): the art's own Math.random, Date.now, Date(), new Date() or a
// date formatted without a date, a file read once the art file has loaded. Deflated, in node_modules/.cache/pxl/builds/
// in a checkout, else the system's temp folder (pxl-builds), up to BUDGET bytes, the least recently used dropped first;
// written aside and renamed into place, so a reader never sees half of one, and one that doesn't read back whole is
// ignored and made again. PXL_CACHE=0 (any command's --no-cache) builds without it.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { threadId } from "node:worker_threads";
import { deflateSync, inflateSync } from "node:zlib";
import type { BuildOut } from "../core/build.ts";
import { Img } from "../core/image.ts";
import type { DiskLog, Project } from "../core/project.ts";

const code = join(import.meta.dirname, ".."), top = join(code, "..");
/** Where the builds are kept. */
export const DIR = existsSync(join(top, "node_modules")) ? join(top, "node_modules", ".cache", "pxl", "builds") : join(tmpdir(), "pxl-builds");
const DISK_MS = 10, WORTH = 300, BUDGET = 512 * 2 ** 20;
export const sha1 = (b: string | Uint8Array) => createHash("sha1").update(b).digest("hex");

/** A hash of every file under `dir` and of the Node running it; "" if one changed after `since` (ms). */
export function sourcesOf(dir: string, since = Infinity): string {
  const h = createHash("sha1").update(`${process.version} ${process.platform} ${process.arch}\0`);
  for (const f of (readdirSync(dir, { recursive: true }) as string[]).sort()) {
    const p = join(dir, f), st = statSync(p);
    if (st.mtimeMs > since) return "";
    if (st.isFile()) h.update(f).update("\0").update(readFileSync(p)).update("\0");
  }
  return h.digest("hex");
}
/**
 * pxl's own code: the folder this file is in (src/, or dist/ installed). Edited since this process started, it may
 * not be the code running: then nothing is kept or read back.
 */
let src: string | undefined;

/**
 * The disk for a project loaded from `files` (p.files, in the order read), `seen` the hash of each as it was read
 * (a file not in it is read now; one not there counts as gone). Undefined: turned off, or pxl changed since it started.
 */
export function diskOf(files: string[], seen: Map<string, string>): Project["disk"] {
  if (process.env.PXL_CACHE === "0" || !(src ??= sourcesOf(code, performance.timeOrigin))) return undefined;
  // (and the time zone and language a date or a number is written in where the art doesn't say)
  const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions(), h = createHash("sha1").update(`${src} ${timeZone} ${locale}\0`);
  for (const f of files) {
    let b = seen.get(f);
    if (b === undefined) try { b = sha1(readFileSync(f)); } catch { b = "gone"; }
    h.update(`${f}\0${b}\0`);
  }
  const base = h.digest("hex"), at = (k: string, needs: Record<string, boolean>) => `${base}\0${k}\0${JSON.stringify(Object.entries(needs).sort())}`;
  // an entry is named by the options it read too (a check's build beside a full one): looked up by each set of this
  // project's options, the names first (no disk). (file: where an entry is, for the tests)
  return Object.assign({
    get: (k: string, opt: Record<string, boolean>) => {
      const o = Object.entries(opt);
      for (let m = 0; m < 1 << o.length; m++) { const r = get(at(k, Object.fromEntries(o.filter((_, i) => m & (1 << i))))); if (r) return r; }
      return undefined;
    },
    put: (k: string, out: BuildOut, log: DiskLog, ms: number) => { if (ms >= DISK_MS) put(at(k, log.needs), out, log, ms); },
  }, { file: (k: string, needs = {}) => fileOf(at(k, needs)) });
}

const fileOf = (key: string) => join(DIR, sha1(key));

/**
 * The entries there when this process first looked, and those it wrote since: a build not among them isn't looked
 * for (an open that fails, on each of a big scene's thousand small builds).
 */
let there: Set<string> | undefined;

function get(key: string): { out: BuildOut; log: DiskLog; ms?: number } | undefined {
  const file = fileOf(key);
  if (!(there ??= new Set((() => { try { return readdirSync(DIR); } catch { return []; } })())).has(basename(file))) return undefined;
  try {
    const raw = inflateSync(readFileSync(file)), n = raw.readUInt32LE(0), head = JSON.parse(raw.toString("utf8", 4, 4 + n));
    if (head.key !== key) return undefined;
    let at = 4 + n;
    const bufs = (head.sizes as number[]).map((s) => raw.buffer.slice(raw.byteOffset + at, raw.byteOffset + (at += s)));
    if (at !== raw.length) return undefined;
    const out = decode(head.v, bufs) as BuildOut;
    try { const now = new Date(); utimesSync(file, now, now); } catch { /* its age only orders what's dropped */ }
    return { out, log: head.log, ms: head.ms as number };
  } catch {
    return undefined;
  }
}

let written = 0, looked = false;
function put(key: string, out: BuildOut, log: DiskLog, ms: number): void {
  const bufs: ArrayBufferView[] = [];
  let v: unknown;
  try { v = encode(out, bufs); } catch (e) { if (e === UNSTORABLE) return; throw e; }
  const head = Buffer.from(JSON.stringify({ key, v, sizes: bufs.map((b) => b.byteLength), log, ms })), len = Buffer.alloc(4);
  len.writeUInt32LE(head.length);
  const data = deflateSync(Buffer.concat([len, head, ...bufs.map((b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength))]), { level: 1 });
  // worth its bytes: WORTH ms of work a MiB kept (the round's scene frames, 40 ms each to compose again, were three
  // quarters of the bytes, and pushed out the traced parts under them: 295 MiB for the file, 9 without them)
  if (ms * 2 ** 20 < WORTH * data.length) return;
  const file = fileOf(key), aside = `${file}.${process.pid}-${threadId}.tmp`;
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(aside, data);
    renameSync(aside, file);
    there?.add(basename(file));
  } catch {
    try { unlinkSync(aside); } catch { /* not written */ }
    return;
  }
  // pruned when this process has written an eighth of the budget, and by the first process that writes after ten
  // minutes without (a stat of each entry: 0.1 s at 9000 of them, not paid by every command)
  if (!looked) { looked = true; try { if (Date.now() - statSync(join(DIR, ".pruned")).mtimeMs > 600_000) written = Infinity; } catch { written = Infinity; } }
  if ((written += data.length) > BUDGET / 8) prune();
}

/** Down to the budget, the least recently used first (a build read back is touched); and what a killed writer left aside. */
export function prune(budget = BUDGET): void {
  written = 0;
  try { writeFileSync(join(DIR, ".pruned"), ""); } catch { /* no folder yet */ }
  let names: string[];
  try { names = readdirSync(DIR); } catch { return; }
  const now = Date.now(), all = names.flatMap((f) => { try { const s = statSync(join(DIR, f)); return [{ f, t: s.mtimeMs, n: s.size }]; } catch { return []; } });
  let sum = 0;
  for (const e of all.filter((e) => e.f !== ".pruned").sort((a, b) => b.t - a.t))
    if ((sum += e.n) > budget || (e.f.endsWith(".tmp") && now - e.t > 600_000)) try { unlinkSync(join(DIR, e.f)); } catch { /* another process took it */ }
}

// ---------------------------------------------------------------- a build as data and back
// Every value as it was: numbers (NaN, -0 too), undefined, holes, the order of keys, the objects shared within it
// (one image as the build's and its layer's), images as Img, typed arrays, Sets and Maps. Anything else (a function,
// a class of its own, a getter, a frozen object, two typed arrays on one buffer) throws UNSTORABLE: not kept.
const UNSTORABLE = new Error("unstorable");
const TYPED = ["Uint8Array", "Int8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array"];
type Typed = new (b: ArrayBuffer) => ArrayBufferView;

export function encode(root: unknown, bufs: ArrayBufferView[]): unknown {
  const refs = new Map<object, number>(), buffers = new Set<ArrayBufferLike>();
  const own = (o: object) => {
    if (!Object.isExtensible(o) || Object.getOwnPropertySymbols(o).length) throw UNSTORABLE;
    const d = Object.getOwnPropertyDescriptors(o), out: [string, unknown][] = [];
    for (const k of Object.keys(d)) {
      const p = d[k];
      if (!("value" in p) || !p.enumerable || !p.writable || !p.configurable) throw UNSTORABLE;
      out.push([k, enc(p.value)]);
    }
    return out;
  };
  const enc = (v: unknown): unknown => {
    if (v === null || typeof v === "string" || typeof v === "boolean") return v;
    if (typeof v === "number") return Number.isFinite(v) && !Object.is(v, -0) ? v : ["n", Object.is(v, -0) ? "-0" : String(v)];
    if (v === undefined) return ["u"];
    if (typeof v !== "object") throw UNSTORABLE;
    const r = refs.get(v);
    if (r !== undefined) return ["r", r];
    refs.set(v, refs.size);
    const proto = Object.getPrototypeOf(v);
    if (ArrayBuffer.isView(v)) {
      const name = (v.constructor as { name: string }).name;
      if (!TYPED.includes(name) || v.constructor !== (globalThis as Record<string, unknown>)[name] || !(v.buffer instanceof ArrayBuffer) || v.byteOffset || v.byteLength !== v.buffer.byteLength || buffers.has(v.buffer)) throw UNSTORABLE;
      buffers.add(v.buffer);
      return ["t", name, bufs.push(v) - 1];
    }
    if (proto === Img.prototype) return ["i", own(v)];
    if (Array.isArray(v)) {
      // (an array of any realm: the art file's run in a context of their own)
      if (!Array.isArray(proto) || !Object.isExtensible(v) || Object.getOwnPropertySymbols(v).length) throw UNSTORABLE;
      const out: unknown[] = [];
      let holes = 0;
      for (let i = 0; i < v.length; i++) out.push(i in v ? enc(v[i]) : (holes++, ["h"]));
      if (Object.getOwnPropertyNames(v).length !== v.length - holes + 1) throw UNSTORABLE;
      return ["a", out];
    }
    if ((proto === Set.prototype || proto === Map.prototype) && !Object.getOwnPropertyNames(v).length && Object.isExtensible(v))
      return proto === Set.prototype ? ["s", [...(v as Set<unknown>)].map(enc)] : ["m", [...(v as Map<unknown, unknown>)].map(([k, x]) => [enc(k), enc(x)])];
    if (proto === null) return ["O", own(v)];
    if (Object.getPrototypeOf(proto) === null && proto.constructor?.name === "Object") return ["o", own(v)];
    throw UNSTORABLE;
  };
  return enc(root);
}

export function decode(root: unknown, bufs: ArrayBuffer[]): unknown {
  const refs: unknown[] = [];
  const reg = <T>(o: T) => (refs.push(o), o);
  const fill = (o: object, props: [string, unknown][]) => {
    for (const [k, x] of props) Object.defineProperty(o, k, { value: dec(x), enumerable: true, writable: true, configurable: true });
    return o;
  };
  const dec = (x: unknown): unknown => {
    if (!Array.isArray(x)) return x;
    const [tag, a, b] = x;
    switch (tag) {
      case "u": return undefined;
      case "n": return a === "-0" ? -0 : Number(a);
      case "r": return refs[a];
      case "t": return reg(new ((globalThis as unknown as Record<string, Typed>)[a])(bufs[b]));
      case "i": return fill(reg(Object.create(Img.prototype)), a);
      case "o": return fill(reg({}), a);
      case "O": return fill(reg(Object.create(null)), a);
      case "a": { const o = reg([] as unknown[]); for (const y of a) { if (Array.isArray(y) && y[0] === "h") o.length++; else o.push(dec(y)); } return o; }
      case "s": { const o = reg(new Set()); for (const y of a) o.add(dec(y)); return o; }
      case "m": { const o = reg(new Map()); for (const [k, y] of a) o.set(dec(k), dec(y)); return o; }
    }
    throw new Error(`not a kept build (${tag})`);
  };
  return dec(root);
}
