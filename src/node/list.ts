// pxl list: a map of an art file to read from: each top-level statement that defines assets, its
// line range, the comment above it, and what it defines (the many assets a loop or a helper makes
// on one line), so an agent reads the 40 lines it needs instead of the file.
import { readFileSync } from "node:fs";
import type { Project } from "../core/project.ts";

/**
 * Top-level statements of a script as [start, end) offsets. A statement ends at `;` or at a line
 * break outside brackets, unless the line ends or the next one starts with something that continues
 * it (an operator, `.`, `)`, `else`). Strings, templates, comments and regex literals are skipped.
 * ponytail: a scanner, not a parser; good enough for art files, which are calls, loops and consts.
 */
export function statements(src: string): [number, number][] {
  const out: [number, number][] = [];
  let depth = 0, start = -1, last = "";
  // a for/while/if header just closed: its body may start on the next line
  let header = false, afterHeader = false;
  const tpl: number[] = []; // depths at which a template's ${ opened
  const next = (i: number) => {
    for (let j = i; j < src.length; j++) {
      if (/\s/.test(src[j])) continue;
      if (src.startsWith("//", j)) { j = src.indexOf("\n", j); if (j < 0) return ""; continue; }
      return src.slice(j, j + 6);
    }
    return "";
  };
  const close = (i: number) => { if (start >= 0) out.push([start, i]); start = -1; header = afterHeader = false; };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i) - 1; if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 1; if (i <= 0) break; continue; }
    if (/\s/.test(c)) {
      if (c === "\n" && depth === 0 && start >= 0 && !afterHeader && !/[=,(\[{+\-*/?:&|.!<>]$/.test(last)) {
        const n = next(i);
        if (!/^([.,?:)\]}+\-*/&|=]|else\b|catch\b|finally\b)/.test(n)) close(i);
      }
      continue;
    }
    if (start < 0) start = i;
    afterHeader = false;
    if (c === '"' || c === "'" || c === "`") {
      // a string; a template's ${ goes back to code until its }
      for (i++; i < src.length && src[i] !== c; i++) {
        if (src[i] === "\\") i++;
        else if (c === "`" && src[i] === "$" && src[i + 1] === "{") { tpl.push(depth); depth++; i++; break; }
      }
      last = c;
      continue;
    }
    if (c === "/" && (last === "" || /[(,=:[!&|?{};]$/.test(last))) {
      // a regex literal
      for (i++; i < src.length && src[i] !== "/"; i++) {
        if (src[i] === "\\") i++;
        else if (src[i] === "[") while (i < src.length && src[i] !== "]") i += src[i] === "\\" ? 2 : 1;
      }
      last = "/";
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (c === ")" && !depth && !header && /^(for|while|if)\b/.test(src.slice(start, start + 6))) {
        header = afterHeader = true;
        last = ")";
        continue;
      }
      if (c === "}" && tpl.length && tpl[tpl.length - 1] === depth) {
        // back into the template string it opened from
        tpl.pop();
        for (i++; i < src.length && src[i] !== "`"; i++) {
          if (src[i] === "\\") i++;
          else if (src[i] === "$" && src[i + 1] === "{") { tpl.push(depth); depth++; i++; break; }
        }
        last = "`";
        continue;
      }
    } else if (c === ";" && depth === 0) { close(i + 1); last = ""; continue; }
    last = src.slice(Math.max(0, i - 1), i + 1).trim();
  }
  close(src.length);
  return out;
}

const lineOf = (src: string, off: number) => src.slice(0, off).split("\n").length;

/** The map, one line per statement that defines something, under a line per file. */
export function listProject(p: Project): string[] {
  const out: string[] = [];
  const byFile = new Map<string, { kind: string; name: string; line: number; col: number }[]>();
  for (const n of p.order) {
    const d = p.assets.get(n)!, m = /^(.*):(\d+):(\d+)$/.exec(d.top ?? d.loc ?? "");
    if (!m) continue;
    (byFile.get(m[1]) ?? byFile.set(m[1], []).get(m[1])!).push({ kind: d.kind, name: n, line: +m[2], col: +m[3] });
  }
  for (const [short, defs] of byFile) {
    const path = p.files.find((f) => f.replace(/^.*[\\/]/, "") === short);
    let src = "";
    try { src = path ? readFileSync(path, "utf8") : ""; } catch { /* listed without ranges */ }
    const lines = src.split("\n"), starts = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
    const spans = src ? statements(src) : [];
    out.push(`${short} (${lines.length} lines)`);
    const groups = new Map<number, typeof defs>();
    for (const d of defs) {
      const off = (starts[d.line - 1] ?? 0) + d.col - 1, s = spans.findIndex(([a, b]) => off >= a && off < b);
      (groups.get(s) ?? groups.set(s, []).get(s)!).push(d);
    }
    for (const [s, g] of groups) {
      const [a, b] = spans[s] ?? [-1, -1];
      const from = a >= 0 ? lineOf(src, a) : g[0].line, to = b >= 0 ? lineOf(src, b) : g[0].line;
      // the comment right above it: its first line
      const isComment = (i: number) => i >= 0 && /^\s*\/\//.test(lines[i] ?? "");
      let k = from - 2, note = "";
      if (isComment(k)) {
        while (isComment(k - 1)) k--;
        note = lines[k].trim().replace(/^\/\/\s*/, "").replace(/^[-=\s]+|[-=\s]+$/g, "").slice(0, 90);
      }
      const kinds = [...new Set(g.map((d) => d.kind))].map((kd) => {
        const c = g.filter((d) => d.kind === kd).length;
        return c > 1 ? `${kd} x${c}` : kd;
      }).join(", ");
      const names = g.length > 4 ? `${g.slice(0, 4).map((d) => d.name).join(", ")} (+${g.length - 4})` : g.map((d) => d.name).join(", ");
      out.push(`  ${`${from}-${to}`.padEnd(9)} ${kinds}: ${names}${note ? `  // ${note}` : ""}`);
    }
  }
  for (const g of p.groups.values()) out.push(`group ${g.name} ${g.loc ?? ""}  [${g.members.join(" ")}]`);
  for (const s of p.sheets) out.push(`sheet ${s.name} ${s.loc ?? ""}`);
  return out;
}
