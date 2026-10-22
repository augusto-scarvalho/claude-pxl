// Where a Claude Code session's tokens went, read from its transcript (the .jsonl files Claude Code keeps
// under ~/.claude/projects/<folder>/). Several files are added up (a pipeline's planner and forks).
//
//   node scripts/tokens.ts <session.jsonl> [more.jsonl ...]
//
// It prints the cost in input-token units (an input token 1, a cache read 0.1, an output token 5, a
// cache write 1.25 to the 5-minute cache or 2 to the 1-hour one, as each reply's usage says: the ratio
// of Claude's prices) split by what it paid for, then each kind of tool
// result and of the agent's own message by how much of the context it took and how often later turns
// read it again (every turn re-reads the whole conversation). Text is counted at 3.6 characters a token,
// an image by its pixels after the API's resize (w*h/750). Thinking leaves no text in the transcript:
// it is the output a turn paid for beyond what it wrote, and it stays in the context.
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node scripts/tokens.ts <session.jsonl> [more.jsonl ...]"); process.exit(1); }

const imgTokens = (b64: string) => {
  const b = Buffer.from(b64.slice(0, 64), "base64");
  if (b[0] !== 0x89 || b[1] !== 0x50) return 1600;
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), s = Math.min(1, 1568 / Math.max(w, h), Math.sqrt(1150000 / (w * h)));
  return Math.round((w * s * h * s) / 750);
};
// a tool call by what it did: pxl's commands by name (however the CLI is spelled: node .../pxl.js, a
// PXL or $P variable), the guides read whole with cat or sed, an example's source, images
const kindOf = (name: string, input: Record<string, unknown>): string => {
  if (name === "Bash" || name === "PowerShell") {
    const c = String(input.command ?? "");
    const m = /(?:pxl(?:\.js)?["']?|\$\{?\w+\}?["']?)\s+(shot|describe|check|help|list|ascii|build|study|compare|steps|blind|serve)\b/.exec(c);
    if (m) return `pxl ${m[1]}${m[1] === "describe" && /--brief/.test(c) ? " --brief" : ""}`;
    const doc = /(SKILL|reference|characters|scenes|lighting|rotation|README)\.md/.exec(c);
    if (doc && /\b(cat|sed|head|tail|awk|grep)\b/.test(c)) return `bash read ${doc[1]}.md`;
    if (/examples\//.test(c) && /\b(cat|sed|head|tail|awk)\b/.test(c)) return "bash read example";
    return "bash other";
  }
  if (name === "Read") {
    const p = String(input.file_path ?? "").replace(/\\/g, "/");
    if (/\.(png|gif|jpe?g|webp)$/i.test(p)) return "read image";
    const doc = /(SKILL|reference|characters|scenes|lighting|rotation)\.md$/.exec(p);
    if (doc) return `read ${doc[1]}.md`;
    if (/\/examples\//.test(p)) return "read example";
    if (/\.px\.js$/.test(p)) return "read own .px.js";
    return "read other";
  }
  return name;
};

// what a token written to the cache cost a reply: 1.25 to the 5-minute cache, 2 to the 1-hour one
// (Claude Code's), as its usage splits them; 1.25 when it doesn't say
const writeWeight = (u: { cache_creation_input_tokens?: number; cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } }) => {
  const m5 = u.cache_creation?.ephemeral_5m_input_tokens ?? 0, h1 = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return m5 + h1 ? (1.25 * m5 + 2 * h1) / (m5 + h1) : 1.25;
};
// (w: what a token written to the cache cost this turn)
type Turn = { ctx: number; cr: number; cw: number; w: number; out: number; inp: number; shown: number; results: number };
const kinds = new Map<string, { n: number; tokens: number; reread: number }>();
let cost = 0, fixedRead = 0, shownWrite = 0, shownRead = 0, thinkOut = 0, shownOut = 0, think = 0, turnsAll = 0, sessions = 0;
for (const f of files) {
  const events = readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const turns: Turn[] = [], uses = new Map<string, { name: string; input: Record<string, unknown> }>(), seen = new Set<string>();
  const added: { kind: string; tokens: number; turn: number }[] = [];
  for (const e of events) {
    const m = e.message;
    if (!m) continue;
    if (e.type === "assistant") {
      let shown = 0;
      for (const c of Array.isArray(m.content) ? m.content : []) {
        if (c.type === "tool_use") {
          uses.set(c.id, { name: c.name, input: c.input ?? {} });
          const t = JSON.stringify(c.input ?? {}).length / 3.6;
          shown += t; added.push({ kind: `(wrote) ${c.name}`, tokens: t, turn: turns.length });
        } else if (c.type === "text") {
          const t = (c.text?.length ?? 0) / 3.6;
          shown += t; added.push({ kind: "(wrote) text", tokens: t, turn: turns.length });
        }
      }
      // (one reply can come in several entries with the same message id: its usage counts once)
      if (m.usage && !seen.has(m.id)) {
        seen.add(m.id);
        const u = m.usage;
        turns.push({ ctx: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), cr: u.cache_read_input_tokens ?? 0, cw: u.cache_creation_input_tokens ?? 0, w: writeWeight(u), out: u.output_tokens ?? 0, inp: u.input_tokens ?? 0, shown, results: 0 });
      } else if (turns.length) turns[turns.length - 1].shown += shown;
    } else if (e.type === "user" && Array.isArray(m.content) && turns.length) {
      for (const c of m.content) {
        if (c.type !== "tool_result") continue;
        const u = uses.get(c.tool_use_id), kind = u ? kindOf(u.name, u.input) : "?";
        for (const p of Array.isArray(c.content) ? c.content : [{ type: "text", text: String(c.content ?? "") }]) {
          const t = p.type === "text" ? (p.text?.length ?? 0) / 3.6 : p.type === "image" ? imgTokens(p.source?.data ?? "") : 0;
          if (!t) continue;
          turns[turns.length - 1].results += t;
          added.push({ kind: p.type === "image" && kind !== "read image" ? `${kind} (image)` : kind, tokens: t, turn: turns.length - 1 });
        }
      }
    }
  }
  const n = turns.length, fixed = turns[0]?.ctx ?? 0;
  turns.forEach((t, i) => {
    const thought = Math.max(0, t.out - t.shown), after = n - 1 - i;
    think += thought;
    cost += t.inp + t.w * t.cw + 0.1 * t.cr + 5 * t.out;
    fixedRead += 0.1 * Math.min(fixed, t.cr);
    shownWrite += t.w * (t.shown + t.results); shownRead += 0.1 * (t.shown + t.results) * after;
    thinkOut += 5 * thought; shownOut += 5 * t.shown;
  });
  for (const a of added) { const k = kinds.get(a.kind) ?? { n: 0, tokens: 0, reread: 0 }; k.n++; k.tokens += a.tokens; k.reread += a.tokens * Math.max(0, n - 1 - a.turn); kinds.set(a.kind, k); }
  turnsAll += n; sessions++;
}
const pc = (v: number) => `${Math.round((100 * v) / cost)}%`, k = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`);
console.log(`${sessions} session${sessions > 1 ? "s" : ""}, ${turnsAll} turns, ${k(cost)} input-token units; thinking ${k(think)} tokens`);
console.log(`  the fixed context (system prompt, tools) read every turn: ${pc(fixedRead)}`);
console.log(`  tool results and what the agent wrote: written ${pc(shownWrite)}, read again ${pc(shownRead)}`);
console.log(`  thinking, as output: ${pc(thinkOut)}; what it wrote, as output: ${pc(shownOut)}`);
console.log(`  the rest (thinking kept and read again, cache rewritten): ${pc(cost - fixedRead - shownWrite - shownRead - thinkOut - shownOut)}`);
const total = [...kinds.values()].reduce((a, v) => a + v.reread, 0) || 1;
console.log("by kind (the most read again first):");
for (const [name, v] of [...kinds].sort((a, b) => b[1].reread - a[1].reread).slice(0, 16))
  console.log(`  ${name.padEnd(24)} ${String(v.n).padStart(4)} x ${String(Math.round(v.tokens / v.n)).padStart(5)} tokens  read again ${k(v.reread).padStart(6)} (${Math.round((100 * v.reread) / total)}%)`);
