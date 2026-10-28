// The written skill against the code: what the guides cite has to exist, and what pxl has has to be
// in the reference. Prose is not parsed, only commands in code spans and names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { Project } from "../src/core/project.ts";
import { OPS } from "../src/core/canvas.ts";
import { main } from "../src/node/cli.ts";

const root = join(import.meta.dirname, "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const pxl = (...a: string[]) => execFileSync(process.execPath, [join(root, "bin/pxl.js"), ...a], { encoding: "utf8" });
const GUIDES = ["SKILL.md", "reference.md", "scenes.md", "characters.md", "environment.md", "lighting.md", "rotation.md", "README.md", "examples/README.md", "lib/README.md", "docs/getting-started.md", "docs/agents.md"];
// each command's flags, from the usage pxl prints
const usage = new Map<string, Set<string>>();
let cur = "";
for (const l of pxl("--help").split("\n")) {
  const m = /^  pxl (\w+)/.exec(l);
  if (m) usage.set((cur = m[1]), usage.get(m[1]) ?? new Set());
  if (cur) for (const f of l.matchAll(/--[\w-]+/g)) usage.get(cur)!.add(f[0]);
}
// commands as the guides write them: in a code span, or a line of a code block
const commands = (f: string) => {
  const text = read(f), fence = /^```\w*\n([^]*?)^```/gm;
  const spans = [...text.replace(fence, "").matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  for (const b of text.matchAll(fence)) spans.push(...b[1].split("\n"));
  return spans.flatMap((s) => [/^\s*(?:PXL|pxl|node \S*bin\/pxl\.js)\s+(\w+)([^|#]*)/.exec(s)].filter((m) => m !== null).map((m) => ({ cmd: m[1], rest: m[2], s })));
};

test("docs: every command and flag the guides cite is in pxl's usage", () => {
  const bad: string[] = [], cited = GUIDES.flatMap(commands);
  assert.ok(cited.length > 100, `only ${cited.length} commands found in the guides`);
  for (const f of GUIDES) for (const { cmd, rest, s } of commands(f)) {
    if (!usage.has(cmd)) { bad.push(`${f}: no command '${cmd}' in \`${s}\``); continue; }
    for (const fl of rest.matchAll(/--[\w-]+/g)) if (!usage.get(cmd)!.has(fl[0])) bad.push(`${f}: '${cmd} ${fl[0]}' isn't in its usage`);
  }
  assert.deepEqual(bad, []);
});

test("docs: every relative link and #anchor in the guides and docs/ leads somewhere", () => {
  // GitHub's anchors: a heading lowercased, its punctuation dropped, spaces as hyphens
  const slug = (h: string) => h.trim().toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");
  const prose = (f: string) => readFileSync(f, "utf8").replace(/^```[^]*?^```/gm, "");
  const anchors = (f: string) => new Set([...prose(f).matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1])));
  const docs = [...GUIDES, ...readdirSync(join(root, "docs")).filter((f) => f.endsWith(".md")).map((f) => `docs/${f}`), "BACKLOG.md"];
  const bad: string[] = [];
  for (const f of new Set(docs)) {
    const p = join(root, f);
    for (const m of prose(p).matchAll(/\]\(([^)\s]+)\)|src="([^"]+)"/g)) {
      const link = m[1] ?? m[2];
      if (/^(https?|mailto):/.test(link)) continue;
      const [file, hash] = link.split("#"), target = file ? join(dirname(p), decodeURI(file)) : p;
      if (!existsSync(target)) bad.push(`${f}: ${link} is missing`);
      else if (hash && target.endsWith(".md") && !anchors(target).has(hash)) bad.push(`${f}: ${link} has no such heading`);
    }
  }
  assert.deepEqual(bad, []);
});

test("docs: SKILL.md stays a map: under 14 KB, the details in the guides it points to", () => {
  // it is loaded whole into every session that draws; it grew from ~2k tokens back to ~7.5k over the
  // rounds before this was kept
  assert.ok(read("SKILL.md").length < 14000, `SKILL.md is ${read("SKILL.md").length} characters: move a detail to its guide and point to it`);
});

test("docs: every guide section SKILL.md sends the agent to prints", async () => {
  // in this process, not a node each (ten of those took 16 s of the suite)
  const help = async (q: string) => { const log = console.log, out: string[] = []; console.log = (s: string) => out.push(String(s)); try { await main(["help", q]); } finally { console.log = log; } return out.join("\n"); };
  for (const [, q] of read("SKILL.md").matchAll(/PXL help "([^"<]+)"/g)) assert.match(await help(q), /^###? /m, `pxl help "${q}" prints no section`);
});

test("docs: every op and DSL global is in the reference, and every example the examples' list names exists", () => {
  const ref = read("reference.md");
  const names = new Set([...OPS, ...Object.keys(new Project().env())]);
  const missing = [...names].filter((n) => !new RegExp(`(^|[^\\w.$])${n}\\(|\`${n}[\`(]`, "m").test(ref));
  assert.deepEqual(missing, [], "not in reference.md");
  const rows = [...read("examples/README.md").matchAll(/^\| `([\w/.]+)`(?:, `([\w/.]+)`)? \|/gm)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
  assert.ok(rows.length > 20);
  for (const r of rows) assert.ok(existsSync(join(root, "examples", r)), `examples/${r}`);
});
