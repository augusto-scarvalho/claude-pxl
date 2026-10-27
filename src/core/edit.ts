// pxl edit's vocabulary (the EditIR): a few closed operations on a scene's named things, each written
// into the art file where its value lives, so the file stays the one source. A stamp's numbers and options
// in its call (or the table it reads, as pxl check --fix writes them), its asset's options at its sprite()
// or anim(), a world3d part's spec. What code computes is refused, saying where it is.
import { PxError } from "./errors.ts";
import { type Knob2d, callAt, listAt, moveInSource } from "./expect.ts";
import { AS } from "./world3d.ts";
import { COMPASS, headingsOf } from "./turnaround.ts";

/** Each operation and the fields it takes besides op, target and scope. */
export const OPS: Record<string, string[]> = {
  move: ["by"], set: ["key", "value"], recolor: ["swap"], flip: ["axis"], frame: ["frame", "t"],
  relation: ["on", "beside", "along", "apart", "at", "around", "attach"], swap: ["asset"], as: ["as"],
  add: ["asset", "like", "beside", "on", "at"],
};
export type Edit = { op: string; target: string; scope?: "instance" | "asset"; by?: number[]; key?: string; value?: unknown; swap?: Record<string, string>; axis?: string; frame?: number; t?: number; asset?: string; like?: string; as?: string; [k: string]: unknown };
type Done = { src: string; said: string } | string;

const FORM = `{ op: "move", target, by: [dx, dy] px (a part's: [dx, dy] or [dx, dy, dz] m) } | { op: "set", target, key, value } | { op: "recolor", target, swap: { key: key } } | { op: "flip", target, axis?: "x" | "y" } | { op: "frame", target, frame | t } | { op: "relation", target, on | beside | along | apart | at (a stamp's) | around | attach (a part's): value } | { op: "swap", target, asset } | { op: "as", target, as: "surface" | "voxels" | "splats" | "mesh" } | { op: "add", target: its new id, asset | like: an id, beside: [id, side, gap] | on: id | at: "id.socket" }; each with scope?: "instance" (default) or "asset"`;
/** What an add places its new stamp by: the id its relation names (undefined: a ground, a row, a path). */
export const addTo = (e: Edit): string | undefined => {
  const v = e.beside ?? e.on ?? e.at, id = Array.isArray(v) ? v[0] : typeof v === "string" && e.at !== undefined ? v.split(".")[0] : v;
  return typeof id === "string" && id !== "ground" ? id : undefined;
};

/** An edit as given (a file's JSON, the command line's), checked: its op, its target, the fields its op takes. */
export function checkEdit(e: unknown): Edit {
  const bad = (why: string) => new PxError(`edit: ${why}, got ${JSON.stringify(e)}. An edit is ${FORM}`);
  if (!e || typeof e !== "object" || Array.isArray(e)) throw bad("an edit is an object");
  const o = e as Edit, takes = OPS[o.op];
  if (!takes) throw bad(`no op '${o.op}' (${Object.keys(OPS).join(", ")})`);
  if (typeof o.target !== "string" || !o.target) throw bad("target is the id of what it changes (pxl inspect lists them; an add's: the new one's)");
  if (o.scope !== undefined && o.scope !== "instance" && o.scope !== "asset") throw bad('scope is "instance" or "asset"');
  const extra = Object.keys(o).filter((k) => !["op", "target", "scope", ...takes].includes(k)), given = takes.filter((k) => o[k] !== undefined);
  if (extra.length) throw bad(`${o.op} takes ${takes.join(", ")}, not ${extra.join(", ")}`);
  if (o.op === "move" && !(Array.isArray(o.by) && (o.by.length === 2 || o.by.length === 3) && o.by.every(Number.isFinite))) throw bad("move's by is [dx, dy] px (a part's: [dx, dy] or [dx, dy, dz] m)");
  if (o.op === "set" && (typeof o.key !== "string" || o.value === undefined)) throw bad("set takes a key and a value");
  if (o.op === "recolor" && !(o.swap && typeof o.swap === "object" && Object.values(o.swap).every((v) => typeof v === "string"))) throw bad('recolor\'s swap is { key: key } (palette keys or "#hex")');
  if (o.op === "flip" && o.axis !== undefined && !["x", "y", "xy"].includes(o.axis)) throw bad('flip\'s axis is "x" (the default), "y" or "xy"');
  if (o.op === "frame" && (given.length !== 1 || !Number.isFinite(o[given[0]]))) throw bad("frame takes frame (its index) or t (ms into its loop)");
  if (o.op === "relation" && given.length !== 1) throw bad("relation takes one of on, beside, along, apart, at (a stamp's), around, attach (a part's)");
  if (o.op === "swap" && typeof o.asset !== "string") throw bad("swap's asset is another asset's name (a part's: a builder's)");
  if (o.op === "as" && !AS.includes(o.as as string)) throw bad(`as is ${AS.map((a) => `"${a}"`).join(", ")}`);
  if (o.op === "add" && (given.filter((k) => k === "asset" || k === "like").length !== 1 || ![o.asset, o.like].some((v) => typeof v === "string") || given.length !== 2 || !addTo(o)))
    throw bad('add takes its new id as target, asset (a name) or like (an id: its asset and options), and one relation to another: beside: [id, side, gap], on: id or at: "id.socket"');
  if (o.op === "add" && o.scope === "asset") throw bad("add places one new stamp: no scope");
  return o;
}

/** A JSON value as the art files write it: "strings", [1, 2], { key: value }, numbers to 3 decimals. */
export const lit = (v: unknown): string => typeof v === "string" ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(lit).join(", ")}]`
  : v && typeof v === "object" ? `{ ${Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${lit(x)}`).join(", ")} }`
  : typeof v === "number" ? String(+v.toFixed(3)) : String(v);
/** A value written out (numbers, strings, lists and objects of them), or undefined: code. */
export function readLit(t: string): unknown {
  try { return JSON.parse(t.trim().replace(/'([^'"\\]*)'/g, '"$1"').replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/,(\s*[\]}])/g, "$1")); } catch { return undefined; }
}

/** An object literal's entries (it opens at src[o]): each key, where the entry starts, and its value. */
export function entries(src: string, o: number): Map<string, { s: number; vs: number; ve: number; text: string }> {
  const out = new Map<string, { s: number; vs: number; ve: number; text: string }>();
  for (const it of listAt(src, o).items) {
    const lead = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/.exec(it.t)![0].length, m = /^([A-Za-z_$][\w$]*|"[^"]*"|'[^']*')\s*:\s*/.exec(it.t.slice(lead));
    if (m) { const vs = it.s + lead + m[0].length, ve = it.s + it.t.trimEnd().length; out.set(m[1].replace(/^["']|["']$/g, ""), { s: it.s, vs, ve, text: src.slice(vs, ve) }); }
  }
  return out;
}
/** src with `key: value` in the object at o: its value replaced, or the entry added last. */
function setKey(src: string, o: number, key: string, value: string): string {
  const e = entries(src, o).get(key);
  if (e) return src.slice(0, e.vs) + value + src.slice(e.ve);
  const { items, end } = listAt(src, o), last = items.filter((i) => i.t.trim()).at(-1);
  if (!last) return src.slice(0, o + 1) + ` ${key}: ${value} ` + src.slice(end);
  const at = last.s + last.t.trimEnd().length;
  return src.slice(0, at) + `, ${key}: ${value}` + src.slice(at);
}
/** src without `key` in the object at o, and the comma before it (after it, when it's first). */
function dropKey(src: string, o: number, key: string): string {
  const e = entries(src, o).get(key);
  if (!e) return src;
  const { items } = listAt(src, o), k = items.findIndex((it) => it.s === e.s), prev = items[k - 1], next = items[k + 1];
  const lead = (it: { s: number; t: string }) => it.s + it.t.length - it.t.trimStart().length;
  if (prev) return src.slice(0, prev.s + prev.t.trimEnd().length) + src.slice(e.ve);
  return next ? src.slice(0, lead(items[k])) + src.slice(lead(next)) : src.slice(0, o + 1) + src.slice(e.ve).trimStart();
}
/** recolor, flip and set on an object of options (a stamp's, or an asset's own): `get` reads one, `put` and `drop` write. */
function optionEdit(e: Edit, get: (k: string) => string | undefined, put: (k: string, v: string) => string, drop: (k: string) => string, where: string): Done {
  if (e.op === "recolor") {
    const c = get("swap"), was = c === undefined ? {} : readLit(c);
    if (!was || typeof was !== "object" || Array.isArray(was)) return `its swap is code: \`${c}\` (${where})`;
    const to = { ...was, ...e.swap };
    return { src: put("swap", lit(to)), said: `swap ${lit(to)} (${where})` };
  }
  if (e.op === "flip") {
    const c = get("flip"), was = c === undefined ? "" : readLit(c);
    if (typeof was !== "string") return `its flip is code: \`${c}\` (${where})`;
    const f = ["x", "y"].filter((a) => was.includes(a) !== (e.axis ?? "x").includes(a)).join("");
    return f ? { src: put("flip", lit(f)), said: `flip ${lit(f)} (${where})` } : { src: drop("flip"), said: `flip taken off (${where})` };
  }
  return { src: put(e.key!, lit(e.value)), said: `${e.key}: ${lit(e.value)} (${where})` };
}

/** What a stamp's edit needs besides its source: its relation's numbers (each the way it moves it), whether its asset is animated, the assets there are. */
export type StampInfo = { knobs: Pick<Knob2d, "key" | "i" | "label" | "move">[]; anim: boolean; has: (name: string) => boolean };
/** A stamp's relations: what places it by another (or a path, a row) and its socket. */
export const REL2D = ["beside", "on", "along", "apart", "at"];
const fileLine = (loc: string) => loc.split(":").slice(0, 2).join(":");

/** An edit of one stamp, its call at `loc`: the new source and what it wrote, or why not. */
export function editStamp(src: string, loc: string, e: Edit, info: StampInfo): Done {
  const at = callAt(src, loc, /^stamp\s*\(/), file = loc.split(":")[0];
  if (at === undefined) return `its stamp isn't at ${loc}`;
  const where = fileLine(loc), args = (s: string) => listAt(s, s.indexOf("(", at)).items;
  const optsOf = (s: string) => { const o = args(s).find((x, i) => i > 0 && x.t.trim().startsWith("{")); return o && o.s + o.t.indexOf("{"); };
  const get = (k: string) => { const o = optsOf(src); return o === undefined ? undefined : entries(src, o).get(k)?.text; };
  // its options object, made after its x, y when it has none
  const put = (s: string, k: string, v: string) => {
    let o = optsOf(s);
    if (o === undefined) {
      const a = args(s), last = a.at(-1)!, end = last.s + last.t.trimEnd().length, add = a.length === 1 ? ", 0, 0, {}" : a.length === 2 && !/^\s*\.\.\./.test(a[1].t) ? ", 0, {}" : ", {}";
      s = s.slice(0, end) + add + s.slice(end);
      o = end + add.length - 2;
    }
    return setKey(s, o, k, v);
  };
  const drop = (s: string, k: string) => { const o = optsOf(s); return o === undefined ? s : dropKey(s, o, k); };
  if (e.op === "move") {
    if (e.by!.length !== 2) return "a stamp moves by [dx, dy] px";
    const [dx, dy] = e.by!, near = (v: number[]) => Math.abs(v[0] - dx) < 0.5 && Math.abs(v[1] - dy) < 0.5;
    // the numbers written for it (its relation's first, as --fix takes them, then its x, y): one that moves
    // it that way, else two
    const knobs = [...info.knobs, { key: "x" as const, label: "x", move: (d: number): [number, number] => [d, 0] }, { key: "y" as const, label: "y", move: (d: number): [number, number] => [0, d] }]
      .filter((k) => typeof moveInSource(src, loc, k.key, 0, k.i) !== "string");
    let plan: [(typeof knobs)[number], number][] | undefined;
    for (const k of knobs) { const v = k.move(1), n2 = v[0] ** 2 + v[1] ** 2, d = n2 ? Math.round((dx * v[0] + dy * v[1]) / n2) : 0; if (d && near(k.move(d))) { plan = [[k, d]]; break; } }
    for (let i = 0; !plan && i < knobs.length; i++) for (let j = i + 1; !plan && j < knobs.length; j++) {
      const a = knobs[i].move(1), b = knobs[j].move(1), det = a[0] * b[1] - a[1] * b[0];
      if (Math.abs(det) < 1e-9) continue;
      const da = Math.round((dx * b[1] - dy * b[0]) / det), db = Math.round((a[0] * dy - a[1] * dx) / det), ma = knobs[i].move(da), mb = knobs[j].move(db);
      if (near([ma[0] + mb[0], ma[1] + mb[1]])) plan = ([[knobs[i], da], [knobs[j], db]] as [(typeof knobs)[number], number][]).filter(([, d]) => d);
    }
    if (!plan) {
      // placed by its relation alone: x, y written into its call, an offset from where the relation puts it
      const a = args(src), end = a[0].s + a[0].t.trimEnd().length;
      if (a[1]?.t.trim().startsWith("{") && REL2D.some((k) => get(k) !== undefined))
        return { src: src.slice(0, end) + `, ${dx}, ${dy}` + src.slice(end), said: `moved ${dx},${dy}: x, y ${dx}, ${dy} written into its call, an offset from where its relation puts it (${where})` };
      const why = moveInSource(src, loc, "x", 0);
      return `no number written for it moves it by ${dx},${dy}${typeof why === "string" ? `: ${why}` : ""}`;
    }
    let s = src;
    const said: string[] = [];
    for (const [k, d] of plan) {
      const w = moveInSource(s, loc, k.key, d, k.i);
      if (typeof w === "string") return w;
      s = w.src;
      said.push(`${k.label} ${w.from} -> ${w.to} (${file}:${w.line})`);
    }
    return { src: s, said: `moved ${dx},${dy}: ${said.join(", ")}` };
  }
  if (e.op === "set" && (e.key === "id" || REL2D.includes(e.key!)))
    return e.key === "id" ? "an id is what rules, relations and sockets name it by: rename it by hand, and them" : `${e.key} is a relation: { op: "relation", ${e.key}: ... }`;
  if (e.op === "recolor" || e.op === "flip" || e.op === "set") return optionEdit(e, get, (k, v) => put(src, k, v), (k) => drop(src, k), where);
  if (e.op === "frame") {
    if (!info.anim) return "it isn't animated: its asset has no frames";
    const k = e.frame !== undefined ? "frame" : "t";
    return { src: drop(put(src, k, lit(e[k])), k === "frame" ? "t" : "frame"), said: `${k}: ${e[k]} (${where})` };
  }
  if (e.op === "relation") {
    const kind = REL2D.find((k) => e[k] !== undefined);
    if (!kind) return "a stamp's relation is on, beside, along, apart or at (around and attach are a part's)";
    const had = REL2D.some((k) => get(k) !== undefined), v = e[kind];
    let s = put(src, kind, lit(v));
    for (const k of REL2D) if (k !== kind) s = drop(s, k);
    // where it stood by its x, y, now placed by another: they become an offset from where that puts it (on
    // the ground or a row, y only; apart keeps where it stands)
    const zero = had || kind === "apart" ? [] : kind === "on" && (typeof v !== "string" || v === "ground") ? [2] : [1, 2];
    const a = args(s);
    if (zero.length && a.length > 1 && !a[1].t.trim().startsWith("{")) {
      const spread = /^\s*\.\.\.\s*(.*)$/.exec(a[1].t)?.[1].trim(), from = a[1].s, to = spread ? a[1].s + a[1].t.length : a[2].s + a[2].t.length;
      const xy = zero.length === 2 ? "0, 0" : spread ? `${spread}[0], 0` : `${a[1].t.trim()}, 0`;
      s = s.slice(0, from) + " " + xy + s.slice(to);
    }
    return { src: s, said: `${kind}: ${lit(v)}${zero.length ? `, its ${zero.length === 2 ? "x, y" : "y"} now 0 (an offset from where it puts it)` : ""} (${where})` };
  }
  if (e.op === "swap") {
    if (!info.has(e.asset!)) return `no asset '${e.asset}'`;
    const a0 = args(src)[0], m = /^(\s*)(["'])[^"'`]*\2(\s*)$/.exec(a0.t);
    if (!m) return `its asset's name is code: \`${a0.t.trim()}\` (${where})`;
    return { src: src.slice(0, a0.s) + m[1] + JSON.stringify(e.asset) + m[3] + src.slice(a0.s + a0.t.length), said: `asset ${JSON.stringify(e.asset)}, was ${a0.t.trim()} (${where})` };
  }
  return `${e.op} is a world3d part's: a stamp's look is its asset's (swap it, or recolor)`;
}

/**
 * add: a new stamp named by its id (the edit's target) and placed by its relation, written as a line after
 * the stamp call at `loc` (what it relates to: so in its layer, drawn after it). Its asset's name, or
 * `like`'s call's asset and options (`like`: that call's source and place; not its id or relation, and its
 * x, y only when it is placed the same way: the same relation, beside's same side).
 */
export function addStamp(src: string, loc: string, e: Edit, like?: { src: string; loc: string }): Done {
  const at = callAt(src, loc, /^stamp\s*\(/), where = fileLine(loc);
  if (at === undefined) return `the stamp it relates to isn't at ${loc}`;
  const end = listAt(src, src.indexOf("(", at)).end + 1, next = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*(.)/.exec(src.slice(end))?.[1];
  if (next !== "," && next !== ")") return `the stamp at ${where} isn't an item of a list (a layer's, a scene's): add it by hand`;
  const rel = REL2D.find((k) => e[k] !== undefined)!, opts = [`${rel}: ${lit(e[rel])}`, `id: ${lit(e.target)}`];
  let name = lit(e.asset), xy = "";
  if (like) {
    const a = callAt(like.src, like.loc, /^stamp\s*\(/), items = a === undefined ? [] : listAt(like.src, like.src.indexOf("(", a)).items;
    if (!items.length) return `like's stamp isn't at ${like.loc}`;
    name = items[0].t.trim();
    const o = items.find((x, i) => i > 0 && x.t.trim().startsWith("{")), E = o ? entries(like.src, o.s + o.t.indexOf("{")) : new Map<string, { text: string }>();
    const was = E.get(rel) && readLit(E.get(rel)!.text), num = (i: number) => /^\s*-?\d+(\.\d+)?\s*$/.test(items[i]?.t ?? "");
    if (was !== undefined && (rel !== "beside" || (Array.isArray(was) && was[1] === (e.beside as unknown[])[1])) && num(1) && num(2)) xy = `, ${items[1].t.trim()}, ${items[2].t.trim()}`;
    for (const [k, v] of E) {
      if (k === "id" || REL2D.includes(k)) continue;
      if (readLit(v.text) === undefined) return `like's ${k} is code (\`${v.text}\` at ${fileLine(like.loc)}): give asset and set it, or add it by hand`;
      opts.push(`${k}: ${v.text}`);
    }
    if (readLit(name) === undefined) return `like's asset is code (\`${name}\` at ${fileLine(like.loc)})`;
  }
  const indent = /^[ \t]*/.exec(src.slice(src.lastIndexOf("\n", at) + 1))![0], nl = src.includes("\r\n") ? "\r\n" : "\n", call = `stamp(${name}${xy}, { ${opts.join(", ")} })`;
  return { src: src.slice(0, end) + `,${nl}${indent}${call}` + src.slice(end), said: `added ${call} (${loc.split(":")[0]}:${src.slice(0, end).split("\n").length + 1}, after ${addTo(e)}'s stamp, in its layer)` };
}

/** An edit of an asset's own options (scope "asset": every placement of it), at its sprite() or anim() call `loc`. */
export function editAsset(src: string, loc: string, name: string, e: Edit): Done {
  const at = callAt(src, loc, /^(sprite|anim)\s*\(/), args = at === undefined ? [] : listAt(src, src.indexOf("(", at)).items;
  if (at === undefined || readLit(args[0]?.t ?? "") !== name) return `'${name}' isn't made by a sprite() or anim() call of its name at ${loc} (code makes it: change it there)`;
  if (!["recolor", "flip", "set"].includes(e.op)) return `${e.op} changes one placement: scope "instance"`;
  let s = src, o = args[1]?.t.trim().startsWith("{") ? args[1].s + args[1].t.indexOf("{") : undefined;
  if (o === undefined) { const end = args[0].s + args[0].t.length; s = src.slice(0, end) + ", {}" + src.slice(end); o = end + 2; }
  const open = o;
  return optionEdit(e, (k) => entries(s, open).get(k)?.text, (k, v) => setKey(s, open, k, v), (k) => dropKey(s, open, k), `${name}'s own options, ${fileLine(loc)}`);
}

/** A turnaround family drawn at one more heading (`deg`, a flip turning one of its sprites), its call at `loc` written out (`turnaround("fox", thing, { headings: ["e"] })`): the new source and the heading's sprite, or why not. */
export function addHeading(src: string, loc: string, family: string, deg: number): { src: string; asset: string; said: string } | string {
  const at = callAt(src, loc, /^turnaround\s*\(/), where = fileLine(loc), args = at === undefined ? [] : listAt(src, src.indexOf("(", at)).items;
  if (at === undefined || readLit(args[0]?.t ?? "") !== family) return `its turnaround() at ${where} isn't written for '${family}' alone (a helper's?): add the heading there by hand`;
  const o = args[2]?.t.trim().startsWith("{") ? args[2].s + args[2].t.indexOf("{") : undefined, h = o === undefined ? undefined : entries(src, o).get("headings"), list = h && readLit(h.text);
  if (!Array.isArray(list)) return `its headings aren't written out at ${where}`;
  const H = headingsOf(undefined, [...list, deg], false), name = H.at(-1)!.name;
  const to = lit([...list, typeof list[0] === "string" && COMPASS.includes(name) ? name : deg]);
  return { src: src.slice(0, h!.vs) + to + src.slice(h!.ve), asset: `${family}_${name}`, said: `headings ${to} (${where})` };
}

/** A part's relations: what places it by another (apart only keeps it clear of one). */
const REL3D = ["on", "beside", "around", "attach", "along"];
/** An edit of a world3d part, its spec `name: { ... }` written once in src (`file` its name); `makers` the builders there are, `params` its builder's. */
export function editPart(src: string, file: string, part: string, e: Edit, makers: string[], params?: string[]): Done {
  const heads = [...src.matchAll(new RegExp(`(^|[\\s{,])${part}\\s*:\\s*\\{`, "g"))];
  if (heads.length !== 1) return `its spec, '${part}: { ... }', isn't written once in ${file}`;
  const o = heads[0].index! + heads[0][0].length - 1, where = `${file}:${src.slice(0, o).split("\n").length}`;
  const get = (k: string) => entries(src, o).get(k), put = (s: string, k: string, v: string) => setKey(s, o, k, v);
  if (e.scope === "asset") return "a part is its builder's one thing here: scope \"instance\" (the builder is code)";
  if (e.op === "move") {
    const a = get("at"), was = a ? readLit(a.text) : [];
    if (!Array.isArray(was) || !was.every(Number.isFinite)) return `its at is code: \`${a!.text}\` (${where})`;
    const to = Array.from({ length: Math.max(was.length, e.by!.length) }, (_, i) => +((was[i] ?? 0) + (e.by![i] ?? 0)).toFixed(3));
    return { src: put(src, "at", lit(to)), said: `moved ${e.by!.join(",")} m: at ${a ? `${a.text} -> ` : ""}${lit(to)} (${where})` };
  }
  if (e.op === "set") {
    const k = e.key!;
    if (k === "as" || k === "seed") return e.op === "set" && k === "as" && !AS.includes(e.value as string) ? `as is ${AS.join(", ")}` : { src: put(src, k, lit(e.value)), said: `${k}: ${lit(e.value)} (${where})` };
    if (["make", "at", "apart", ...REL3D].includes(k)) return `${k} is ${k === "make" ? "swap's" : k === "at" ? "move's" : "relation's"}`;
    if (params && !params.includes(k)) return `its builder has no parameter '${k}' (it has: ${params.join(", ")})`;
    const p = get("params");
    if (!p) return { src: put(src, "params", `{ ${k}: ${lit(e.value)} }`), said: `params.${k}: ${lit(e.value)} (${where})` };
    if (!p.text.startsWith("{")) return `its params are code: \`${p.text}\` (${where})`;
    return { src: setKey(src, p.vs, k, lit(e.value)), said: `params.${k}: ${lit(e.value)}${(() => { const was = entries(src, p.vs).get(k); return was ? `, was ${was.text}` : ""; })()} (${where})` };
  }
  if (e.op === "relation") {
    const kind = [...REL3D, "apart"].find((k) => e[k] !== undefined);
    if (!kind) return "a part's relation is on, beside, around, attach, along or apart";
    const had = REL3D.some((k) => get(k)), v = e[kind];
    let s = put(src, kind, lit(v));
    if (kind !== "apart") for (const k of REL3D) if (k !== kind) s = dropKey(s, o, k);
    // where it stood by its at, now placed by another: its at was where it stood, not an offset
    const dropAt = !had && kind !== "apart" && get("at") !== undefined;
    if (dropAt) s = dropKey(s, o, "at");
    return { src: s, said: `${kind}: ${lit(v)}${dropAt ? ", its at taken off (where it stood: now the relation places it)" : ""} (${where})` };
  }
  if (e.op === "swap") return makers.includes(e.asset!) ? { src: put(src, "make", lit(e.asset)), said: `make ${lit(e.asset)}, was ${get("make")?.text} (${where})` } : `no builder '${e.asset}' (make3d has: ${makers.join(", ")})`;
  if (e.op === "as") return { src: put(src, "as", lit(e.as)), said: `as ${lit(e.as)} (${where})` };
  return `${e.op} is a stamp's: a part's colors are its materials (draw3d's or look3d()'s mats, or its own mats)`;
}
