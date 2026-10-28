# Evaluating the 3D DSL: four comparisons

How to tell whether pxl's 3D layer (fields, builders, `world3d`, local edits, `expect3d`, the part
trace) makes agents better at 3D pixel art, rather than only making the code run. The four
comparisons are the dsl3d plan's (§6.6), in the spirit of BlenderGym: a task is done when the
requested change happened and nothing else did, not when the file builds. Each comparison has been
run once an arm, Claude Sonnet at low effort, for US$1.57 in all ([the runs](#the-runs-one-an-arm)):
a first measure, not a verdict.

## Contents

- [What every comparison shares](#what-every-comparison-shares)
- [1. Generic primitives vs semantic builders](#1-generic-primitives-vs-semantic-builders)
- [2. Full rewrite vs local edit](#2-full-rewrite-vs-local-edit)
- [3. Fixes by the model alone vs numeric, local fixes](#3-fixes-by-the-model-alone-vs-numeric-local-fixes)
- [4. A screenshot vs a screenshot and the execution trace](#4-a-screenshot-vs-a-screenshot-and-the-execution-trace)
- [The runs, one an arm](#the-runs-one-an-arm)
- [Doing it again](#doing-it-again)

## What every comparison shares

- **The same model, effort, requests and budget** in both arms; only what the arm changes differs.
  Several runs an arm (three at least) before reading a difference as one: a single run is a first
  measure.
- **Tasks held out.** The scenes and requests used to judge are not the examples the builders were
  developed on (`examples/sdf/`): new compositions of the same builders, new requests.
- **How a run is made.** One headless session per run, in a folder of its own holding the start
  files, with the skill as installed:
  `scripts/model-study.sh <brief.txt> <runs folder>/<arm> <model> <effort>` (it records pxl's commit,
  the start and end times, and Claude Code's `result.json`: turns, cost, duration, the session's id).
  The briefs name pxl's CLI as `node <pxl>/bin/pxl.js`: put the repository's path in first
  (`sed "s|<pxl>|$PWD|g" docs/study/eval3d/edit.txt > runs/edit.txt`).
- **Metrics.**

| Metric | How it is measured |
|---|---|
| Fidelity to the request | a checklist per request, read off `scripts/eval3d.ts` (each part's pixels, where its middle is, its mean color, before and after: a denser canopy paints more pixels, a wind from the left moves the smoke's middle right, a bluish mist's mean color turns blue) and off the diff of the file |
| Unintended changes | `node scripts/eval3d.ts <before> <after> <scene> --touch <the parts the request names>`: of the pixels the other parts painted, at four moments of the loop, how many changed color or now show another part. Between two `world3d`s, `world.changed(other)` names the parts whose fingerprints differ |
| Validity | `pxl check`: warnings, and the `expect3d` rules held (`after's expects` in eval3d's report) |
| Quality in several views | the scene from the side, the top, in iso and through the HD-2D camera, as GIFs, ranked blind by a person watching them (an agent judging stills ranked the model study's scenes the wrong way round: [model-study.md](model-study.md)) |
| Time, model calls, tokens | `result.json` (duration, turns, cost); `node scripts/tokens.ts <session>.jsonl` (the session's transcript under `~/.claude/projects/`): where the tokens went, what was read again |
| Ease of the next edit | a second request on the arm's result: its unintended changes and cost, as above |

## 1. Generic primitives vs semantic builders

**Does the abstraction cut code and errors without narrowing what can be made?**

- **Arms.** A: `sdf` primitives only (the brief forbids `make3d` and `world3d`). B: the builders and
  `world3d` allowed.
- **Tasks** (held out): a winter grove (two trees of different sizes, a house with snow on its cap,
  mossy rocks, a mist); a crystal outcrop with a glowing rune by a rock; a cottage with a door, a
  window and a sign readable through the HD-2D camera; each to be shown in the four views.
- **Measure** fidelity, validity (turns until `pxl check` is clean, exceptions met on the way),
  quality in four views, lines of the art file, cost; and variety: the same brief run with two seeds,
  how much the two results differ (eval3d between them, every part counted).

## 2. Full rewrite vs local edit

**Are the parts already approved kept?**

- **Arms.** A: write the file anew as a whole for the request. B: change only what the request
  names, in place (`world.edit`, a part's parameters).
- **Tasks.** A start scene ([`study/eval3d/grove.px.js`](study/eval3d/grove.px.js): the grove of
  `examples/sdf/world.px.js` before its edit, `kit.px.js` copied beside it) and requests of growing
  reach: "a denser canopy, twistier branches, wind from the left, a bluish ground mist"; "snow on the
  house"; "move the rock to the left of the house"; "a second, smaller tree behind the house".
- **Measure** unintended changes first (`--touch` the parts each request names), then fidelity,
  expects, cost; then a second request on each result.

## 3. Fixes by the model alone vs numeric, local fixes

**Can simple defects be fixed with fewer model calls?**

- **Defects seeded** in the start scene, each making an `expect3d` rule fail: the rock pushed into
  the house (`apart`), the house raised off the ground (`on`), the smoke attached to the wrong socket
  (`near`), the canopy shrunk under the trunk's top (`above`).
- **Arms.** A: the agent gets `pxl check`'s warning and fixes the file as it sees fit. B: the agent
  may change only the numbers the failing rule names (a gap, a position, a parameter), one at a
  time, re-running the check; or no agent at all, `pxl check --fix`: a search over one number of the
  parts the rule names until it holds, written into the file (model calls: zero).
- **Measure** rules held after, unintended changes, model calls and tokens, time.

## 4. A screenshot vs a screenshot and the execution trace

**Does the agent find a defect's cause better with the trace?**

- **Defects seeded** whose cause the picture doesn't show: a material swapped on one part (the door
  drawn in the moss's ramp), a decal hidden under the cap's rim, a detail set drawn in its ramp's
  darkest tone, a part placed by the wrong relation.
- **Arms.** A: the scene's PNG and the art file. B: the same, and `pxl steps <file> <scene> --at x,y`
  at the defect (the steps that painted the pixel, their source lines, and `part: house.door`).
- **Measure** whether the first answer names the right part and line, turns and tokens until the fix,
  unintended changes of the fix.

## The runs, one an arm

One headless session an arm, Claude Sonnet 5.5 at low effort, on pxl as of the commit before the
one that adds this section (the 3D layer as phases 1 to 7 left it). The briefs and start files are
in [`study/eval3d/`](study/eval3d); scored with `scripts/eval3d.ts` (four moments of the loop) and
`pxl check`.

| Comparison, task | Arm | Cost, turns, time | Result |
|---|---|---:|---|
| 1. A crystal outcrop with a glowing rune and a second, smaller rock (held out) | A, primitives | $0.24, 14, 65 s | 31 lines; all four asks met, the rock a flat mossy cushion; check clean |
| | B, builders | $0.22, 15, 60 s | 23 lines, 2 expects held; the crystal's rock not mossy (the builder had no parameter for it) and the "smaller" rock bigger than it |
| 2. "A denser canopy, twistier branches, wind from the left, a bluish ground mist" | A, rewrite | $0.23, 10, 35 s | 0 of 17,348 px of the house and the rock changed; did more than asked (5 limbs) |
| | B, local edit | $0.15, 8, 49 s | 0 changed; `twist: 70` out of range (now refused) |
| 2. "Snow on the house's cap, and the rock moved to the left of the house" | A, rewrite | $0.22, 9, 26 s | the same file as B's: 292 of 29,037 px of the other parts changed (1.0%: mist the moved rock covers) |
| | B, local edit | $0.12, 7, 23 s | the same |
| 3. Two defects seeded: the house 0.6 m up, the rock pushed into it | A, as it sees fit | $0.12, 4, 33 s | house down to 0, rock gap -1.2 to 1.2; 6 of 6 expects |
| | B, the numbers only | $0.09, 5, 34 s | the same two numbers; 6 of 6 |
| | B', `pxl check --fix` | $0, no model, 3 s | house down to 0, rock gap to -0.75 (the least that holds); 6 of 6 |
| 4. The door drawn green (a ramp override in the file) | A, the picture | $0.087, 5, 19 s | the right line at the first answer, fixed |
| | B, the picture and `pxl steps --at` | $0.086, 4, 20 s | the same, a turn fewer |

In comparison 3 every arm changed the same 768 of 27,474 px of the parts it doesn't name (2.8%: the
oak and the mist the house covers once it is down), so the arms differ only in cost.

What it says, as a first measure:

- **The scene as data keeps the approved parts in both arms of comparison 2.** Writing the file anew
  the agent kept the parts' builders, seeds and places, so the pixels came out the same as the local
  edit's; the rewrite cost half again to three quarters more. The protection is in `world3d`, not in
  the agent's restraint.
- **Builders: a shorter file, the same cost, a narrower reach.** The builders' arm wrote a quarter
  fewer lines and checked its relations, but bent the request to what the parameters say: no moss on
  the crystal's rock. Fixed in pxl (`make3d.crystal({ moss })`); the next builder gaps will show the
  same way.
- **A numeric fix needs no model.** `pxl check --fix` held both rules with two numbers in 3 s; it
  takes the least change that holds (the rock at -0.75, its edge under the cap, where the agents
  moved it out to 1.2): a rule says what must hold, not where the author wanted it.
- **The trace is cheap and saved a turn** on a defect a careful reader finds anyway; the defects
  that need it (a part placed by the wrong relation, a decal under a rim) are the ones to try next.

## Doing it again

From the repository, a comparison's two arms (comparison 2's first task here; the others take
`outcrop.px.js` with `primitives.txt` and `builders.txt`, `defects.px.js` as `grove.px.js` with
`fix.txt` and `numbers.txt`, `door.px.js` as `grove.px.js` and its first frame as `grove.png` with
`look.txt` and `trace.txt`, `grove.px.js` with `edit2.txt` and `rewrite2.txt`):

```sh
mkdir -p runs/rewrite/sonnet-low runs/edit/sonnet-low
cp -r lib runs/   # kit.px.js includes ../../lib/
for a in rewrite edit; do
  cp docs/study/eval3d/grove.px.js examples/sdf/kit.px.js runs/$a/sonnet-low/
  sed "s|<pxl>|$PWD|g" docs/study/eval3d/$a.txt > runs/$a.txt
  scripts/model-study.sh runs/$a.txt runs/$a sonnet low &
done; wait
for a in rewrite edit; do
  node scripts/eval3d.ts docs/study/eval3d/grove.px.js runs/$a/sonnet-low/grove.px.js grove --touch oak,smoke,mist
done
```

Run the sessions against a copy of pxl at one commit (`git worktree add`, its path in the briefs) when
pxl is being changed meanwhile.
