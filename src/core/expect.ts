// A 2D scene's rules, its `expect: [...]`: what should hold of its placements, read as describe reads
// them (each one's pixels and box, its feet, its layer and drawing order, the gaps between), at every
// frame pxl check checks; expect3d's rules for a scene that is its code. A placement is named by its
// stamp's `id`, or by its asset's name where the scene places it once. A failing rule is fixed by one
// number, where one of the placements it names stands, by expect3d's search (searchKnobs), and written
// where the stamp's number is: the call's own, or a table's (`AT = { pack: [127, 148] }`, setKnobInSource).
import type { Placement } from "./canvas.ts";
import { TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { Img } from "./image.ts";
import type { World } from "./model.ts";
import { type Region, regionPred } from "./util.ts";
import { feetOf, groundUnder } from "./describe.ts";
import { type Knob, searchKnobs, setKnobInSource, setListItem } from "./world3d.ts";

/** A placement's name, or a box [x, y, w, h] (a path painted in the ground, a region). */
type Thing = string | number[];
export type Rule2d = {
  beside?: [string, Thing, { gap?: number | number[]; side?: string }?]; before?: [string, string]; apart?: [string, Thing, number?];
  inside?: [string, Region]; onGround?: [string, (number | ((x: number) => number))?]; while?: [Rule2d, Rule2d]; frames?: number[];
};
const KINDS = ["beside", "before", "apart", "inside", "onGround", "while"], SIDES = ["left", "right", "above", "below"];
const FORMS = `{ beside: [a, b, { gap: [min, max], side: "left" | "right" | "above" | "below" }] } (either or both), { before: [a, b] } (a drawn in front), { apart: [a, b, min px] }, { inside: [a, region] }, { onGround: [a, row or profile()?] } or { while: [rule, rule] }, each with frames: [first, last] if it holds over a span only; a and b a stamp's id or an asset placed once, b also a box [x, y, w, h]`;
const box4 = (v: unknown) => Array.isArray(v) && v.length === 4 && v.every(Number.isFinite);
const ruleOf = (r: Rule2d): [string, unknown[]] => {
  const ks = Object.keys(r ?? {}).filter((k) => k !== "frames"), kind = ks[0], args = (r as Record<string, unknown>)?.[kind];
  if (ks.length !== 1 || !KINDS.includes(kind) || !Array.isArray(args)) throw new PxError(`expect: a rule is ${FORMS}; got ${JSON.stringify(r)}`);
  return [kind, args];
};
// (no gap: any, overlapping too)
const gapOf = (r: Rule2d): number[] => { const g = r.beside?.[2]?.gap; return g === undefined ? [-Infinity, Infinity] : typeof g === "number" ? [g, g] : g; };

/** A scene's rules checked as they are written (the names are checked at pxl check, where the placements are). */
export function checkExpect(rules: unknown, world?: World): void {
  if (!Array.isArray(rules)) throw new PxError(`expect is a list of rules: ${FORMS}`);
  const one = (r: Rule2d) => {
    const [kind, a] = ruleOf(r), bad = (why: string) => new PxError(`expect: ${kind} ${why}, got ${JSON.stringify(r)}`);
    const f = r.frames;
    if (f !== undefined && !(Array.isArray(f) && f.length === 2 && f.every(Number.isInteger) && f[0] <= f[1])) throw bad("frames is [first, last], whole numbers");
    if (kind === "while") {
      if (a.length !== 2 || a.some((q) => (q as Rule2d)?.frames)) throw bad("is [rule, rule]: the first holds wherever the second does (frames on the while itself)");
      return a.forEach((q) => one(q as Rule2d));
    }
    if (typeof a[0] !== "string") throw bad("names a placement first: a stamp's id, or an asset placed once");
    if (kind === "before" && typeof a[1] !== "string") throw bad("is [a, b]: a drawn in front of b");
    if ((kind === "beside" || kind === "apart") && typeof a[1] !== "string" && !box4(a[1])) throw bad("is [a, b, ...]: b a placement or a box [x, y, w, h]");
    if (kind === "beside") {
      const o = (a[2] ?? {}) as { gap?: unknown; side?: unknown }, g = typeof o.gap === "number" ? [o.gap, o.gap] : o.gap;
      if (typeof o !== "object" || Object.keys(o).some((k) => k !== "gap" && k !== "side") || (g === undefined && o.side === undefined)) throw bad("takes { gap, side }, one or both (a side alone: at any distance, overlapping too)");
      if (g !== undefined && !(Array.isArray(g) && g.length === 2 && g.every(Number.isFinite) && 0 <= g[0] && g[0] <= g[1])) throw bad("gap is px between their pixels, n or [min, max] from 0 (touching)");
      if (o.side !== undefined && !SIDES.includes(o.side as string)) throw bad(`side is ${SIDES.map((s) => `"${s}"`).join(", ")} (where a is off b)`);
    }
    if (kind === "apart" && a[2] !== undefined && !((a[2] as number) >= 0)) throw bad("is [a, b, min px >= 0] (0: no overlap)");
    if (kind === "inside") try { regionPred(a[1] as Region); } catch { throw bad("is [a, region]: [x, y, w, h], [cx, cy, r], a polygon or (x, y) => bool"); }
    if (kind === "onGround" && a[1] === undefined && world?.ground === undefined) throw bad("stands on the scene's world.ground: give the scene one, or the rule a row or a profile([x0, y0, x1, y1, ...])");
    if (kind === "onGround" && a[1] !== undefined && !Number.isFinite(a[1]) && typeof a[1] !== "function") throw bad("is [a, row or profile([x0, y0, x1, y1, ...])]");
  };
  for (const r of rules) one(r as Rule2d);
}

const thing = (t: Thing) => (typeof t === "string" ? t : JSON.stringify(t).replace(/,/g, ", "));
/** A rule as words: "campfire left of logs, 2-6 px apart", "bedroll in front of tent". */
export function ruleText2d(r: Rule2d): string {
  const [kind, a] = ruleOf(r), span = r.frames ? ` (frames ${r.frames[0]}-${r.frames[1]})` : "";
  if (kind === "while") return `${ruleText2d(a[0] as Rule2d)} while ${ruleText2d(a[1] as Rule2d)}${span}`;
  const [g0, g1] = gapOf(r), side = (a[2] as { side?: string } | undefined)?.side;
  const words: Record<string, () => string> = {
    beside: () => `${a[0]} ${side ? `${side === "above" || side === "below" ? side : `${side} of`}` : "beside"} ${thing(a[1] as Thing)}${g0 === -Infinity ? "" : `, ${g0 === g1 ? g0 : `${g0}-${g1}`} px apart`}`,
    before: () => `${a[0]} in front of ${a[1]}`,
    apart: () => `${a[0]} apart from ${thing(a[1] as Thing)}${a[2] ? `, ${a[2]} px or more` : " (no overlap)"}`,
    inside: () => `${a[0]} inside ${typeof a[1] === "function" ? "its region" : thing(a[1] as number[])}`,
    onGround: () => `${a[0]} on the ground${typeof a[1] === "number" ? ` (y ${a[1]})` : a[1] ? " (its profile)" : ""}`,
  };
  return words[kind]() + span;
}

/** A placement a rule names at a frame, and its drawing order; or why there is none. */
export type Named = { p: Placement; i: number } | string;
/** The names a scene's rules use. */
export function namesOf(rules: Rule2d[]): string[] {
  const out = new Set<string>();
  const walk = (r: Rule2d) => { const [kind, a] = ruleOf(r); if (kind === "while") return a.forEach((q) => walk(q as Rule2d)); for (const v of a.slice(0, 2)) if (typeof v === "string") out.add(v); };
  rules.forEach(walk);
  return [...out];
}
/** A frame checked: the placements the rules name, and what each stamp placed by a relation is placed by. */
export type Frame2d = { f: number; at: Map<string, Named>; refs?: Map<string, string> };
/** Each name's placement in a frame (not in a layer that only blends: a shadow, a light): its stamp's id, else its asset's name, as `at: "id.socket"` names them. */
export function nameAll(placements: Placement[], blended: Set<string>, names: string[]): Omit<Frame2d, "f"> {
  const at = new Map<string, Named>(), all = placements.map((p, i) => ({ p, i })).filter(({ p }) => !blended.has(p.layer ?? ""));
  for (const n of names) {
    const own = all.filter(({ p }) => (p.id ?? p.name) === n), ids = all.filter(({ p }) => p.id && p.name === n).map(({ p }) => p.id);
    at.set(n, own.length === 1 ? own[0] : own.length ? `'${n}' is placed ${own.length} times: give the one the rule means an id (stamp(..., { id: "${n}_1" }))` : `nothing is placed as '${n}'${ids.length ? ` (its placements are named by their ids: ${[...new Set(ids)].join(", ")})` : ""}`);
  }
  const refs = new Map(all.filter(({ p }) => p.rel?.to).map(({ p }) => [p.id ?? p.name, p.rel!.to!]));
  return { at, ...(refs.size ? { refs } : {}) };
}

/** Where each name stands moved to, px: the fix's trials. */
export type Shift = Map<string, [number, number]>;
type At = { img: Img; x: number; y: number; key: string };
// each image's pixels once: its box and the edge pixels (a gap is between edges)
const masks = new WeakMap<Img, { bb?: { x: number; y: number; w: number; h: number }; edge: number[]; id: string }>();
const mask = (img: Img) => {
  let m = masks.get(img);
  if (m) return m;
  const edge: number[] = [], W = img.w, H = img.h, on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && img.data[y * W + x] !== TRANSPARENT;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y) && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1) && on(x - 1, y - 1) && on(x + 1, y + 1) && on(x - 1, y + 1) && on(x + 1, y - 1))) edge.push(x, y);
  masks.set(img, (m = { bb: img.bounds(), edge, id: img.hash() }));
  return m;
};
const boxes = new Map<string, Img>();
const boxImg = (b: number[]) => { const k = b.join(); let i = boxes.get(k); if (!i) { i = new Img(b[2], b[3]); i.data.fill(0xffffffff); boxes.set(k, i); } return i; };
const span = (t: At) => { const b = mask(t.img).bb!; return { x0: t.x + b.x, y0: t.y + b.y, x1: t.x + b.x + b.w - 1, y1: t.y + b.y + b.h - 1 }; };
/** Empty px between two things' pixels, 8-neighbour steps as describe counts them (0: touching); -n: n px of one on the other. */
function gap(A: At, B: At): number {
  const a = mask(A.img), b = mask(B.img), sa = span(A), sb = span(B);
  let over = 0;
  for (let y = Math.max(sa.y0, sb.y0); y <= Math.min(sa.y1, sb.y1); y++)
    for (let x = Math.max(sa.x0, sb.x0); x <= Math.min(sa.x1, sb.x1); x++)
      if (A.img.data[(y - A.y) * A.img.w + x - A.x] !== TRANSPARENT && B.img.data[(y - B.y) * B.img.w + x - B.x] !== TRANSPARENT) over++;
  if (over) return -over;
  // ponytail: every edge pixel against every other (a few thousand pairs for props); a distance field if big things get slow
  let m = Infinity;
  const lo = Math.max(sb.x0 - sa.x1, sa.x0 - sb.x1, sb.y0 - sa.y1, sa.y0 - sb.y1);
  for (let i = 0; i < a.edge.length && m > lo; i += 2)
    for (let j = 0; j < b.edge.length; j += 2) { const d = Math.max(Math.abs(A.x + a.edge[i] - B.x - b.edge[j]), Math.abs(A.y + a.edge[i + 1] - B.y - b.edge[j + 1])); if (d < m) m = d; }
  return m - 1;
}
/** What a rule found, by where the things it reads stand and what they look like: a still scene's frames, and the fix's trials, measured once. */
const memo = new WeakMap<Rule2d, Map<string, string | undefined>>();
/**
 * Is a off b on that side: its box's two edges past b's that way (a lantern above a long path is above
 * it wherever along it; a pot by a fire whose flames reach over it, left of it as their flames flicker).
 */
function toward(A: At, B: At, side: string): boolean {
  const a = span(A), b = span(B);
  return side === "left" ? a.x0 < b.x0 && a.x1 < b.x1 : side === "right" ? a.x0 > b.x0 && a.x1 > b.x1 : side === "above" ? a.y0 < b.y0 && a.y1 < b.y1 : a.y0 > b.y0 && a.y1 > b.y1;
}

/** Run a scene's rules over the frames checked: each rule's text, the frames it fails at and the first's numbers. */
export function runRules2d(rules: Rule2d[], frames: Frame2d[], world?: World, sh: Shift = new Map()): { text: string; ok: boolean; fails: number[]; detail?: string }[] {
  // how far a name is moved: its own move, and what it's placed by's (it follows that)
  const moved = (t: string, fr: Frame2d, n = 0): [number, number] => {
    const own = sh.get(t) ?? [0, 0], by = fr.refs?.get(t);
    if (!by || n > 32) return own;
    const o = moved(by, fr, n + 1);
    return [own[0] + o[0], own[1] + o[1]];
  };
  const atOf = (t: Thing, fr: Frame2d): At | string => {
    if (typeof t !== "string") return { img: boxImg(t), x: t[0], y: t[1], key: `box ${t}` };
    const q = fr.at.get(t)!;
    if (typeof q === "string") return q;
    if (!mask(q.p.img).bb) return `'${t}' draws nothing at this frame`;
    // (a move along a lane's bend can fall between pixels: drawn floored, as a stamp is)
    const [dx, dy] = moved(t, fr), x = Math.floor(q.p.x + dx), y = Math.floor(q.p.y + dy);
    return { img: q.p.img, x, y, key: `${mask(q.p.img).id},${x},${y}` };
  };
  // undefined: it holds at that frame; else what it found
  const failAt = (r: Rule2d, fr: Frame2d): string | undefined => {
    const [kind, a] = ruleOf(r), A = atOf(a[0] as Thing, fr);
    if (typeof A === "string") return A;
    if (kind === "before") {
      const qa = fr.at.get(a[0] as string) as { p: Placement; i: number }, qb = fr.at.get(a[1] as string)!;
      if (typeof qb === "string") return qb;
      const pa = qa.p, pb = qb.p, sorted = pa.layer === pb.layer && pa.sort !== undefined && pb.sort !== undefined;
      const ka = sorted ? pa.sort! + moved(a[0] as string, fr)[1] : 0, kb = sorted ? pb.sort! + moved(a[1] as string, fr)[1] : 0;
      if (ka > kb || (ka === kb && qa.i > qb.i)) return undefined;
      return `it is drawn behind it: ${sorted ? `both in '${pa.layer}', sorted by y, it stands at y ${ka} and ${a[1]} at y ${kb}` : pa.layer === pb.layer ? `both in '${pa.layer ?? "the scene"}', it placed first` : `its layer '${pa.layer ?? "the scene"}' is under '${pb.layer ?? "the scene"}'`}`;
    }
    const B = kind === "beside" || kind === "apart" ? atOf(a[1] as Thing, fr) : undefined;
    if (typeof B === "string") return B;
    let m = memo.get(r);
    if (!m) memo.set(r, (m = new Map()));
    const key = `${A.key}|${B?.key}`;
    if (!m.has(key)) m.set(key, measure(r, kind, a, A, B));
    return m.get(key);
  };
  const measure = (r: Rule2d, kind: string, a: unknown[], A: At, B?: At): string | undefined => {
    if (B) {
      const g = gap(A, B), [g0, g1] = kind === "beside" ? gapOf(r) : [(a[2] as number) ?? 0, Infinity], side = (a[2] as { side?: string } | undefined)?.side;
      const said = g < 0 ? `they overlap by ${-g} px` : `the gap is ${g} px`;
      if (kind === "beside" && side && !toward(A, B, side)) {
        const s = span(A), t = span(B), v = side === "above" || side === "below", range = (u: typeof s) => (v ? `y ${u.y0}-${u.y1}` : `x ${u.x0}-${u.x1}`);
        return `it isn't ${v ? side : `${side} of`} it: it spans ${range(s)}, ${thing(a[1] as Thing)} ${range(t)} (${said})`;
      }
      return g >= g0 && g <= g1 ? undefined : `${said}, wanted ${g1 === Infinity ? `${g0} or more` : g0 === g1 ? g0 : `${g0}-${g1}`}`;
    }
    if (kind === "inside") {
      const ok = regionPred(a[1] as Region), s = span(A);
      let out = 0;
      for (let y = 0; y < A.img.h; y++) for (let x = 0; x < A.img.w; x++) if (A.img.data[y * A.img.w + x] !== TRANSPARENT && !ok(A.x + x, A.y + y)) out++;
      return out ? `${out} of its px are outside (it spans x ${s.x0}-${s.x1}, y ${s.y0}-${s.y1})` : undefined;
    }
    // onGround: its feet within a px of the ground's row under them (pxl check's feet rule)
    const [x, feet] = feetOf(A)!, G = a[1], g = typeof G === "number" ? G : typeof G === "function" ? (G as (x: number) => number)(x) : groundUnder(world?.ground, x, feet);
    return g === undefined || Math.abs(g - feet) < 2 ? undefined : `its feet (y ${feet}) are ${Math.abs(g - feet)} px ${g > feet ? "above" : "below"} the ground (y ${g})`;
  };
  return rules.map((r) => {
    const [kind, a] = ruleOf(r), text = ruleText2d(r), fails: number[] = [];
    let detail: string | undefined;
    for (const fr of frames) {
      if (r.frames && (fr.f < r.frames[0] || fr.f > r.frames[1])) continue;
      let d: string | undefined;
      if (kind === "while") { const d1 = failAt(a[0] as Rule2d, fr); d = d1 && !failAt(a[1] as Rule2d, fr) ? `${ruleText2d(a[1] as Rule2d)} holds and ${ruleText2d(a[0] as Rule2d)} doesn't: ${d1}` : undefined; }
      else d = failAt(r, fr);
      if (d === undefined) continue;
      fails.push(fr.f);
      detail ??= frames.length > 1 ? `at frame ${fr.f} ${d}` : d;
    }
    return { text, ok: !fails.length, fails, ...(detail ? { detail } : {}) };
  });
}

/**
 * A number a fix may change, of a placement the rule names: its x or y, or its relation's (beside's gap,
 * along's s or u: the i-th of its list), by whole px; `move` how far a change moves it (and so what is
 * placed by a relation to it).
 */
export interface Knob2d { part: string; key: "x" | "y" | "beside" | "along"; i?: number; label: string; value: number; move: (d: number) => [number, number] }
/**
 * A failing rule fixed by changing one number of a placement it names (its relation's first, then where
 * it stands), by the fewest px that make it hold and leave every rule that held holding (expect3d's
 * search, a px at a time up to 64). `knobs`: which may change (those the file writes). Undefined when none does.
 */
export function fixRule2d(rules: Rule2d[], r: Rule2d, frames: Frame2d[], world: World | undefined, sh: Shift, knobs: Knob2d[]): { knob: Knob2d; to: number } | undefined {
  if (ruleOf(r)[0] === "while") return undefined;
  const run = (q: Rule2d, s: Shift) => runRules2d([q], frames, world, s)[0].ok;
  const held = rules.filter((q) => q !== r && run(q, sh));
  const moved = (k: Knob2d, v: number): Shift => { const s = new Map(sh), d = s.get(k.part) ?? [0, 0], m = k.move(v); s.set(k.part, [d[0] + m[0], d[1] + m[1]]); return s; };
  return searchKnobs(knobs, {
    place: () => true, steps: Array.from({ length: 64 }, (_, i) => i + 1), settle: (k, sign, _lo, hi) => k.value + sign * hi,
    holds: (k, v) => run(r, moved(k, v)), keeps: (k, v) => { const s = moved(k, v); return held.every((q) => run(q, s)); },
  });
}

/**
 * The stamp's number a 2D knob moves, in the art file's text (its call at `loc`, "file:line:col"): its
 * own literal, or a table's (`stamp("pack", ...AT.pack)` or `AT.pack[0]`: the `pack: [127, 148]`
 * written once); its relation's, the i-th of the list in its options (`beside: ["tent", "left", 4]`; one
 * left out, a gap or a u, written after the others). Moved `by` px: the new text, the number's old and
 * new value and its line; or why it can't be.
 */
export function moveInSource(src: string, loc: string, key: Knob2d["key"], by: number, n = 0): { src: string; from: number; to: number; line: number } | string {
  const [, line, col] = loc.split(":").map(Number), lines = src.split("\n");
  if (!(line >= 1 && line <= lines.length)) return `its stamp isn't at ${loc}`;
  let o = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + col - 1;
  if (!/^stamp\s*\(/.test(src.slice(o, o + 40))) return `its stamp isn't at ${loc}`;
  // its arguments: split at the commas outside brackets and strings
  o = src.indexOf("(", o) + 1;
  const args: { s: number; t: string }[] = [];
  let depth = 0, s = o, q = "";
  for (let i = o; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = ""; continue; }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c) && depth-- === 0) { args.push({ s, t: src.slice(s, i) }); break; }
    else if (c === "," && depth === 0) { args.push({ s, t: src.slice(s, i) }); s = i + 1; }
  }
  const lineAt = (k: number) => src.slice(0, k).split("\n").length, spreadOf = (t?: string) => /^\s*\.\.\.\s*[\w$]+\.([\w$]+)\s*$/.exec(t ?? "")?.[1];
  // a table's: the j-th number of `part: [...]`, set where it's written once
  const inTable = (part: string, j: number, text: string) => {
    const m = new RegExp(`(?:^|[\\s{,])${part}\\s*:\\s*\\[([^\\]]*)\\]`).exec(src), from = Number(m?.[1].split(",")[j]);
    const out = Number.isFinite(from) ? setKnobInSource(src, { part, key: "at", i: j, value: from } as Knob, from + by) : undefined;
    return out === undefined ? `its ${key} is \`${text}\`, and '${part}: [...]' isn't written once with numbers` : { src: out, from, to: from + by, line: lineAt(m!.index) };
  };
  if (key === "beside" || key === "along") {
    // its options written out as an object: the relation's list there (along's s and u may be a table's, `[WAY, ...AT.lamp]`)
    const o = args.slice(1).find((a) => a.t.trim().startsWith("{")), m = o && new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(o.t);
    const items = m?.[1].split(","), sp = n >= 1 ? spreadOf(items?.[1]) : undefined;
    if (sp) return inTable(sp, n - 1, items![1].trim());
    const was = items?.[n] === undefined ? (n === 2 ? 0 : NaN) : Number(items[n].trim() || NaN);
    const out = o && m && Number.isFinite(was) ? setListItem(o.t, m, n, was + by) : undefined;
    if (!out) return `its ${key}'s ${n === 2 ? (key === "beside" ? "gap" : "u") : "s"} isn't a number written in its options at ${loc}`;
    return { src: src.slice(0, o!.s) + out + src.slice(o!.s + o!.t.length), from: was, to: was + by, line: lineAt(o!.s + m!.index) };
  }
  if (args[1]?.t.trim().startsWith("{")) return `its ${key} isn't written: its relation alone places it (give it x, y to move it by hand)`;
  const i = key === "x" ? 1 : 2, spread = spreadOf(args[1]?.t);
  const arg = spread ? args[1] : args[i], text = arg?.t.trim() ?? "";
  const table = spread ? [spread, i - 1] : /^[\w$]+\.([\w$]+)\s*\[\s*([01])\s*\]$/.exec(text)?.slice(1).map((v, j) => (j ? +v : v));
  if (table) return inTable(table[0] as string, table[1] as number, text);
  if (!/^-?\d+(\.\d+)?$/.test(text)) return `its ${key} is computed in code (\`${text || "missing"}\` at ${loc})`;
  const at = arg.s + arg.t.indexOf(text), from = Number(text);
  return { src: src.slice(0, at) + String(from + by) + src.slice(at + text.length), from, to: from + by, line: src.slice(0, at).split("\n").length };
}
