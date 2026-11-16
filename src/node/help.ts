// `pxl help [term]`: the reference looked up instead of read. With no term, an index: each section
// of reference.md with the names it documents, and each guide's sections with their size. With a
// term, only what names it: a command's block of the usage and the CLI paragraphs that begin with it;
// the reference rows that define it in full (a method's by its name after the dot; a sub-row by its name and subject,
// "rig3d head", the name alone naming its sub-rows), one line for each other place
// that mentions it, the guide sections whose heading has its words (in full, when it names no op or
// option), and a few places the examples use it. A lookup costs a few hundred tokens; the whole
// reference costs ~12k. `all`: every mention and use in full.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { didYouMean } from "../core/errors.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIDES = ["scenes.md", "characters.md", "environment.md", "lighting.md", "rotation.md", "lib/README.md"];
/** A guide as a word of the term picks it ("scenes 12"; the library's README: "lib taking an entry"). */
const gname = (g: string) => (g === "lib/README.md" ? "lib" : g.replace(".md", ""));
/** Mentions, guide lines and example uses shown before "(…N more)". */
const FEW = { mention: 5, guide: 2, example: 3 };

/** `names`: what the row's first cell starts its code with (`sdf.box(`: sdf); `methods`: a name after its dot (box, `.rotate`: rotate);
 * `sub`: a sub-row's subject (`rig3d` `head`: head), not a name of its own. */
interface Entry { section: string; text: string; names: string[]; methods: string[]; row: boolean; sub?: string }
interface Section { file: string; head: string; level: number; text: string }

/** reference.md as entries: table rows (with the names in their first cell) and paragraphs. */
function entries(): Entry[] {
  const lines = readFileSync(join(ROOT, "reference.md"), "utf8").split(/\r?\n/), out: Entry[] = [];
  let h2 = "", h3 = "", para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ section: h3 ? `${h2} > ${h3}` : h2, text: para.join("\n"), names: [], methods: [], row: false });
    para = [];
  };
  for (const line of lines) {
    if (line.startsWith("## ")) { flush(); h2 = line.slice(3); h3 = ""; continue; }
    if (line.startsWith("### ")) { flush(); h3 = line.slice(4); continue; }
    if (line.startsWith("| `")) {
      flush();
      const first = line.split(" | ")[0], sub = /^\| `([\w$]+)` `([\w$]+)`/.exec(first);
      out.push({ section: h3 ? `${h2} > ${h3}` : h2, text: line, names: sub ? [sub[1]] : [...first.matchAll(/`(?:c\.)?([A-Za-z_$][\w$]*)/g)].map((m) => m[1]), methods: [...first.matchAll(/`(?:[A-Za-z_$][\w$]*)?\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]), row: true, sub: sub?.[2] });
      continue;
    }
    if (!line.trim() || line.startsWith("|") || line.startsWith("#")) { flush(); continue; }
    if (line.startsWith("- ")) flush();               // a bullet is an entry of its own
    para.push(line);
  }
  flush();
  return out;
}

/** Every ## and ### section of these files (the guides), each with its text up to the next heading as high. */
function sections(files = GUIDES): Section[] {
  const out: Section[] = [];
  for (const file of files) {
    let lines: string[];
    try { lines = readFileSync(join(ROOT, file), "utf8").split(/\r?\n/); } catch { continue; }
    lines.forEach((l, i) => {
      const m = /^(#{2,3}) (.+)$/.exec(l);
      if (!m) return;
      let end = i + 1;
      while (end < lines.length && !(/^#{2,3} /.test(lines[end]) && lines[end].indexOf(" ") <= m[1].length)) end++;
      out.push({ file, head: m[2], level: m[1].length, text: lines.slice(i, end).join("\n").trim() });
    });
  }
  return out;
}

function examples(dir = join(ROOT, "examples")): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...examples(p));
    else if (f.endsWith(".px.js")) out.push(p);
  }
  return out;
}

const k = (chars: number) => `~${(chars / 3600).toFixed(1)}k tokens`;
/** The sentence (or table cell) of `text` that matches, cut to about `n` characters around the match. */
function snippet(text: string, re: RegExp, n = 150): string {
  const parts = text.replace(/^\|\s*|\s*\|$/g, "").split(/ \| |(?<=\.) (?=[A-Z`])|\n/);
  const hit = parts.find((s) => re.test(s)) ?? text;
  if (hit.length <= n) return hit.trim();
  const at = Math.max(0, (hit.search(re) || 0) - n / 3);
  return (at ? "…" : "") + hit.slice(at, at + n).trim() + "…";
}

export function help(term?: string, opts: { all?: boolean; usage?: string } = {}): string {
  const all = entries();
  if (!term) {
    // the index: one line per section, the names it documents
    const out = ["pxl help <name> prints what the reference says about it and where the examples use it.", ""];
    const bySection = new Map<string, Set<string>>();
    for (const e of all) if (e.row) for (const n of e.names.slice(0, 2)) (bySection.get(e.section) ?? bySection.set(e.section, new Set()).get(e.section)!).add(n);
    for (const [s, names] of bySection) out.push(`${s}: ${[...names].join(" ")}`);
    const prose = [...new Set(all.filter((e) => !e.row).map((e) => e.section.split(" > ")[0]))].filter((s) => s && ![...bySection.keys()].some((k) => k.startsWith(s)));
    out.push(`Also in reference.md: ${prose.join(", ")}`, "", `Guides, by section (size in thousands of tokens): pxl help "<words of a heading>" prints one (e.g. pxl help "characters 9"). Read the ones your task needs:`);
    for (const g of GUIDES) {
      const heads = sections().filter((s) => s.file === g && s.level === 2);
      if (heads.length) out.push(`  ${g}: ${heads.map((s) => `${s.head} (${(s.text.length / 3600).toFixed(1)})`).join("; ")}`);
    }
    return out.join("\n");
  }
  const t = term.replace(/[()`]/g, "").trim(), low = t.toLowerCase(), out: string[] = [];
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const word = new RegExp(`\\b${esc}\\b`, "i"), inCode = new RegExp("`[^`]*\\b" + esc + "\\b[^`]*`", "i");
  let last = "";
  const print = (es: Entry[], label = (_: Entry) => "") => { for (const e of es) { const h = `[reference.md: ${e.section}]${label(e)}`; if (h !== last) out.push((last = h)); out.push(e.text); } };
  // a command (shot, lib): its block of the usage, then the CLI paragraphs that begin with it (and the bullets after them), whole
  let cur = "";
  const block = (opts.usage ?? "").split("\n").filter((l) => (cur = /^ {2}pxl (\w+)/.exec(l)?.[1] ?? (l.startsWith("      ") ? cur : "")) === low);
  if (block.length) out.push("[pxl --help]", ...block);
  const begins = new RegExp("^(?:An? )?`" + esc + "\\b", "i"), cli: Entry[] = [];
  if (block.length) all.forEach((e, i) => { if (e.section.startsWith("CLI") && (begins.test(e.text) || (e.text.startsWith("- ") && cli.includes(all[i - 1])))) cli.push(e); });
  print(cli);
  // reference: the rows that document it, whole; a method by its name too (sdf.box, .rotate). A name that is
  // both (box(), sdf.box): the shorter row first, each labelled as it is written
  const is = (n: string) => n.toLowerCase() === low;
  // a sub-row (`rig3d` `head`) whole by its two words ("rig3d head"); by its name or its subject alone a line
  // saying how to ask for it (--all: whole), so `help light` doesn't print mesh()'s light
  const kin = all.filter((e) => e.sub && (is(e.names[0]) || is(e.sub)));
  const rows = all.filter((e) => e.row && (e.sub ? is(`${e.names[0]} ${e.sub}`) : e.names.some(is) || e.methods.some(is)));
  const both = rows.some((e) => e.names.some(is)) && rows.some((e) => !e.names.some(is));
  if (both) rows.sort((a, b) => a.text.length - b.text.length);
  if (opts.all) rows.push(...kin);
  print(rows, (e) => (both ? ` ${new RegExp("`((?:[A-Za-z_$][\\w$]*)?\\.?" + esc + ")\\b", "i").exec(e.text)?.[1] ?? t}` : ""));
  if (!opts.all && kin.length) out.push("[reference.md: by subject]", ...kin.map((e) => `  pxl help "${e.names[0]} ${e.sub}" (${k(e.text.length)})${e.text.split(" | ")[0].replace(/^\| `[\w$]+` `[\w$]+`,?\s*/, "").replace(/^(?=.)/, ": ")}`));
  let own = [...cli, ...rows, ...kin];
  // guide sections whose file and heading have every word of the term: whole when the term is no
  // op or option (a topic: "small animals", "characters 9"), else named so they can be asked for
  const words = low.split(/[^a-z0-9§]+/).map((w) => w.replace(/^§/, "")).filter((w) => w.length > 1 || /\d/.test(w));
  // (a word that is a guide's name picks that guide; numbers alone pick those sections, any of them:
  // "characters 1 4 5")
  // whole words, a plural too ("shadow": "Shadows and light"), so "anim" doesn't pick "Small animals"
  const inHead = (w: string, s: Section) => new RegExp(`(^|[^a-z0-9])${w}${/^\d+$/.test(w) ? "" : "s?"}([^a-z0-9]|$)`).test(s.head.toLowerCase());
  const guide = (w: string) => GUIDES.some((g) => gname(g) === w);
  const nums = words.some((w) => /^\d+$/.test(w)) && words.every((w) => /^\d+$/.test(w) || guide(w));
  const secs = sections().filter((s) => {
    const i = words.indexOf(gname(s.file)), rest = words.filter((_, j) => j !== i);
    if (!rest.length) return i >= 0;
    const numbered = (w: string) => /^\d+$/.test(w) ? /^(\d+)\./.exec(s.head)?.[1] === w : inHead(w, s);
    return nums ? (i >= 0 || !words.some(guide)) && rest.some(numbered) : rest.every((w) => inHead(w, s));
  }).filter((s, _, a) => !a.some((p) => p !== s && p.file === s.file && p.text.includes(s.text)));   // not a ### again under its ## ("diagonal")
  // a section of the reference itself whose heading starts with its words ("glow": Glow, "anim":
  // Animation) is where a name with no row of its own is defined: that one whole, the guides named
  const refs = !own.length && !nums && words.length
    ? sections(["reference.md"]).filter((s) => words.every((w) => new RegExp(`(^|[^a-z0-9])${w}`).test(s.head.toLowerCase()))) : [];
  const refWhole = refs.length <= 2 ? refs : [];
  for (const s of refWhole) out.push(`[reference.md: ${s.head}]`, s.text);
  if (refs.length > refWhole.length) out.push(`[reference.md: ${refs.length} sections]`, ...refs.slice(0, 8).map((s) => `  pxl help "${s.head}" (${k(s.text.length)})`));
  // a name with no row or section of its own, defined by its signature in a code block (`sheet(name,
  // [...], { cols?, ... })` under "Assets": that line) or in prose as a call (`vnoise(x, y)` in a bullet of
  // "Procedural texture", `corners("dirt", ...)` under "Terrain tilesets"): that paragraph whole, first
  const code = all.filter((e) => !e.row && e.text.startsWith("```")).flatMap((e) => e.text.split("\n").filter((l) => l.startsWith(t + "(")).map((l) => ({ ...e, text: l, block: e })));
  if (!own.length && !refs.length) print((own = [...code, ...all.filter((e) => !e.row && !e.text.startsWith("```") && e.text.includes("`" + t + "("))]));
  const whole = !block.length && !own.length && !refWhole.length && (secs.length <= 2 || nums) ? secs : [];
  for (const s of whole) out.push(`[${s.file}]`, s.text);
  if (secs.length > whole.length) {
    const list = opts.all ? secs : secs.slice(0, 8);
    out.push(`[guides: ${secs.length} sections]`, ...list.map((s) => `  pxl help "${gname(s.file)} ${s.head}" (${k(s.text.length)})`), ...(secs.length > list.length ? [`  (…${secs.length - list.length} more)`] : []));
  }
  // other places in the reference that mention it: a line each (a paragraph counts only when it names
  // it in code: "loops that wrap seamlessly" is not `wrap`)
  const mention = all.filter((e) => !own.includes(e) && !own.some((o) => (o as { block?: Entry }).block === e) && (e.row ? word.test(e.text) : inCode.test(e.text)));
  const shown = opts.all ? mention : mention.slice(0, FEW.mention);
  if (shown.length) out.push(`[reference.md: also mentioned in]`);
  for (const e of shown) {
    if (opts.all) { out.push(`  ${e.section}:`, e.text); continue; }
    const name = e.row ? /^\|\s*`([^`]*)`/.exec(e.text)?.[1] : undefined;
    out.push(`  ${e.section}${name ? ` (${name})` : ""}: ${snippet(e.text, word)}`);
  }
  if (mention.length > shown.length) out.push(`  (…${mention.length - shown.length} more: pxl help ${t} --all)`);
  // guides: the lines that name it in code, outside the sections printed whole
  for (const g of GUIDES) {
    let lines: string[];
    try { lines = readFileSync(join(ROOT, g), "utf8").split(/\r?\n/); } catch { continue; }
    const hits = lines.map((l, i) => [l, i] as const).filter(([l]) => inCode.test(l) && !whole.some((s) => s.file === g && s.text.includes(l)));
    const few = opts.all ? hits : hits.slice(0, FEW.guide);
    if (few.length) out.push(`[${g}]`, ...few.map(([l, i]) => `  ${i + 1}: ${opts.all ? l.trim() : snippet(l, inCode, 140)}`), ...(hits.length > few.length ? [`  (…${hits.length - few.length} more)`] : []));
  }
  // examples (and the library, lib/): where it is used (a call, a key; a method of a name the reference
  // writes with its methods: make3d.oak, not floor.slice), one per file first
  const dot = all.some((e) => e.row && e.text.split(" | ")[0].includes("`" + t + "."));
  const use = new RegExp(`\\b${esc}\\s*(?:[(:]${dot ? "|\\.[A-Za-z_$]" : ""})`);
  const used: { file: string; line: string }[] = [];
  for (const f of [...examples(), ...examples(join(ROOT, "lib"))]) {
    const file = relative(ROOT, f).replace(/\\/g, "/");
    readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => { if (use.test(l)) used.push({ file, line: `  ${file}:${i + 1}: ${l.trim().slice(0, 150)}` }); });
  }
  if (used.length) {
    const firsts = used.filter((u, i) => used.findIndex((v) => v.file === u.file) === i);
    const pick = opts.all ? used : [...firsts, ...used.filter((u) => !firsts.includes(u))].slice(0, FEW.example);
    out.push(`[examples: ${used.length} uses${used.length > pick.length ? `, ${pick.length} shown` : ""}]`, ...pick.map((u) => u.line));
  }
  if (!out.length) {
    const names = [...new Set(all.flatMap((e) => [...e.names, ...e.methods]))];
    return `nothing about '${t}'${didYouMean(t, names)}. pxl help lists every section.`;
  }
  return out.join("\n");
}
