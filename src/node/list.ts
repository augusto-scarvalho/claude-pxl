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
type Def = { kind: string; name: string; line: number; col: number };

/**
 * One file's map: a line per statement that defines assets (those a loop makes on one line), per
 * function, and per const that runs 5 lines or more (a model, a table), in order, each with the first
 * line of the comment right above it.
 */
function mapFile(short: string, src: string, defs: Def[], header = ""): string[] {
  const lines = src.split("\n"), starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  const spans = src ? statements(src) : [];
  const groups = new Map<number, Def[]>();
  for (const d of defs) {
    const off = (starts[d.line - 1] ?? 0) + d.col - 1, s = spans.findIndex(([a, b]) => off >= a && off < b);
    (groups.get(s) ?? groups.set(s, []).get(s)!).push(d);
  }
  // the code between: functions, and consts long enough to be worth finding
  spans.forEach(([a, b], s) => {
    if (groups.has(s)) return;
    const m = /^(?:export\s+)?(?:async\s+)?(function)\s*\*?\s*([\w$]+)|^(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=/.exec(src.slice(a, a + 200));
    if (m && (m[1] || lineOf(src, b) - lineOf(src, a) >= 4)) groups.set(s, [{ kind: m[1] ? "function" : "const", name: m[2] ?? m[3], line: lineOf(src, a), col: 1 }]);
  });
  const isComment = (i: number) => i >= 0 && /^\s*\/\//.test(lines[i] ?? "");
  const rows = [...groups].map(([s, g]) => {
    const [a, b] = spans[s] ?? [-1, -1];
    const from = a >= 0 ? lineOf(src, a) : g[0].line, to = b >= 0 ? lineOf(src, b) : g[0].line;
    // the comment right above it: its first line
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
    return { from, text: `  ${`${from}-${to}`.padEnd(9)} ${kinds}: ${names}${note ? `  // ${note}` : ""}` };
  });
  return [`${short} (${lines.length} lines${header})`, ...rows.sort((x, y) => x.from - y.from).map((r) => r.text)];
}

/** The map, one line per statement that defines something, under a line per file. */
export function listProject(p: Project): string[] {
  const out: string[] = [];
  const byFile = new Map<string, Def[]>();
  for (const n of p.order) {
    const d = p.assets.get(n)!, m = /^(.*):(\d+):(\d+)$/.exec(d.top ?? d.loc ?? "");
    if (!m) continue;
    (byFile.get(m[1]) ?? byFile.set(m[1], []).get(m[1])!).push({ kind: d.kind, name: n, line: +m[2], col: +m[3] });
  }
  for (const f of p.files) {
    const short = f.replace(/^.*[\\/]/, "");
    if (!/\.px\.[jt]s$|\.[cm]?[jt]s$/.test(short)) continue;
    let src = "";
    try { src = readFileSync(f, "utf8"); } catch { /* listed without ranges */ }
    out.push(...mapFile(short, src, byFile.get(short) ?? []));
  }
  for (const g of p.groups.values()) out.push(`group ${g.name} ${g.loc ?? ""}  [${g.members.join(" ")}]`);
  for (const s of p.sheets) out.push(`sheet ${s.name} ${s.loc ?? ""}`);
  return out;
}

/** A file that doesn't run on its own (one meant to be included): mapped from its text alone. */
export function listText(path: string, why: string): string[] {
  const src = readFileSync(path, "utf8"), defs: Def[] = [];
  for (const [a] of statements(src)) {
    const m = /^(sprite|anim|scene|rig|font|group|sheet)\s*\(\s*["'`]([^"'`]+)/.exec(src.slice(a, a + 200));
    if (m) defs.push({ kind: m[1], name: m[2], line: lineOf(src, a), col: a - src.lastIndexOf("\n", a - 1) });
  }
  return mapFile(path.replace(/^.*[\\/]/, ""), src, defs, `; not run on its own (${why}): mapped from its text, so what loops make isn't named`);
}
