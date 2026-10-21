// The written skill against the code: what the guides cite has to exist, and what pxl has has to be
// in the reference. Prose is not parsed, only commands in code spans and names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { Project } from "../src/core/project.ts";
import { OPS } from "../src/core/canvas.ts";

const root = join(import.meta.dirname, "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const pxl = (...a: string[]) => execFileSync(process.execPath, [join(root, "bin/pxl.js"), ...a], { encoding: "utf8" });
const GUIDES = ["SKILL.md", "reference.md", "scenes.md", "characters.md", "lighting.md", "rotation.md", "README.md", "docs/getting-started.md", "docs/agents.md"];
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

test("docs: every guide section SKILL.md sends the agent to prints", () => {
  for (const [, q] of read("SKILL.md").matchAll(/PXL help "([^"<]+)"/g)) assert.match(pxl("help", q), /^## /m, `pxl help "${q}" prints no section`);
});

test("docs: every op and DSL global is in the reference, and every example SKILL.md lists exists", () => {
  const ref = read("reference.md");
  const names = new Set([...OPS, ...Object.keys(new Project().env())]);
  const missing = [...names].filter((n) => !new RegExp(`(^|[^\\w.$])${n}\\(|\`${n}[\`(]`, "m").test(ref));
  assert.deepEqual(missing, [], "not in reference.md");
  const rows = [...read("SKILL.md").matchAll(/^\| `([\w/.]+)`(?:, `([\w/.]+)`)? \|/gm)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
  assert.ok(rows.length > 20);
  for (const r of rows) assert.ok(existsSync(join(root, "examples", r)), `examples/${r}`);
});
