// `pxl help [term]`: the reference looked up instead of read. With no term, an index: each section
// of reference.md with the names it documents, and the guides with their sections. With a term,
// only what names it: the reference rows and paragraphs (under their section), the guide lines,
// and a few places the examples use it. A lookup costs a few hundred tokens; the whole reference
// costs ~9k.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { didYouMean } from "../core/errors.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIDES = ["scenes.md", "characters.md", "lighting.md", "rotation.md"];

interface Entry { section: string; text: string; names: string[]; row: boolean }

/** reference.md as entries: table rows (with the names in their first cell) and paragraphs. */
function entries(): Entry[] {
  const lines = readFileSync(join(ROOT, "reference.md"), "utf8").split(/\r?\n/), out: Entry[] = [];
  let h2 = "", h3 = "", para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ section: h3 ? `${h2} > ${h3}` : h2, text: para.join("\n"), names: [], row: false });
    para = [];
  };
  for (const line of lines) {
    if (line.startsWith("## ")) { flush(); h2 = line.slice(3); h3 = ""; continue; }
    if (line.startsWith("### ")) { flush(); h3 = line.slice(4); continue; }
    if (line.startsWith("| `")) {
      flush();
      const first = line.split(" | ")[0];
      out.push({ section: h3 ? `${h2} > ${h3}` : h2, text: line, names: [...first.matchAll(/`([A-Za-z_$][\w$]*)/g)].map((m) => m[1]), row: true });
      continue;
    }
    if (!line.trim() || line.startsWith("|") || line.startsWith("#")) { flush(); continue; }
    para.push(line);
  }
  flush();
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

export function help(term?: string): string {
  const all = entries();
  if (!term) {
    // the index: one line per section, the names it documents
    const out = ["pxl help <name> prints what the reference says about it and where the examples use it.", ""];
    const bySection = new Map<string, Set<string>>();
    for (const e of all) if (e.row) for (const n of e.names.slice(0, 2)) (bySection.get(e.section) ?? bySection.set(e.section, new Set()).get(e.section)!).add(n);
    for (const [s, names] of bySection) out.push(`${s}: ${[...names].join(" ")}`);
    const prose = [...new Set(all.filter((e) => !e.row).map((e) => e.section.split(" > ")[0]))].filter((s) => s && ![...bySection.keys()].some((k) => k.startsWith(s)));
    out.push(`Also in reference.md: ${prose.join(", ")}`, "", "Guides (read the one your task needs, whole):");
    for (const g of GUIDES) {
      let text: string;
      try { text = readFileSync(join(ROOT, g), "utf8"); } catch { continue; }
      const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].replace(/^\d+\.\s*/, ""));
      out.push(`  ${g}: ${heads.join("; ")}`);
    }
    return out.join("\n");
  }
  const t = term.replace(/[()`]/g, ""), low = t.toLowerCase(), out: string[] = [];
  const word = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  // reference: rows that document it first, then rows and paragraphs that mention it
  const own = all.filter((e) => e.row && e.names.some((n) => n.toLowerCase() === low));
  // a paragraph counts only when it names it in code ("loops that wrap seamlessly" is not `wrap`)
  const inCode = new RegExp("`[^`]*\\b" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b[^`]*`", "i");
  const mention = all.filter((e) => !own.includes(e) && (e.row ? word.test(e.text) : inCode.test(e.text)));
  let last = "";
  for (const e of [...own, ...mention.slice(0, Math.max(3, 8 - own.length))]) {
    if (e.section !== last) { out.push(`[reference.md: ${e.section}]`); last = e.section; }
    out.push(e.text);
  }
  if (mention.length > Math.max(3, 8 - own.length)) out.push(`(…${mention.length - Math.max(3, 8 - own.length)} more mentions: grep -n "${t}" reference.md)`);
  // guides: the lines that name it in code
  const code = new RegExp("`[^`]*\\b" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b[^`]*`", "i");
  for (const g of GUIDES) {
    let lines: string[];
    try { lines = readFileSync(join(ROOT, g), "utf8").split(/\r?\n/); } catch { continue; }
    const hits = lines.map((l, i) => [l, i] as const).filter(([l]) => code.test(l));
    if (hits.length) out.push(`[${g}]`, ...hits.slice(0, 3).map(([l, i]) => `  ${i + 1}: ${l.trim()}`), ...(hits.length > 3 ? [`  (…${hits.length - 3} more)`] : []));
  }
  // examples: where it is used
  const use = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[(:]`);
  const used: string[] = [];
  for (const f of examples()) {
    readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => { if (use.test(l)) used.push(`  ${relative(ROOT, f).replace(/\\/g, "/")}:${i + 1}: ${l.trim().slice(0, 150)}`); });
  }
  if (used.length) out.push(`[examples: ${used.length} uses]`, ...used.slice(0, 5));
  if (!out.length) {
    const names = [...new Set(all.flatMap((e) => e.names))];
    return `nothing about '${t}'${didYouMean(t, names)}. pxl help lists every section.`;
  }
  return out.join("\n");
}
