# Evaluating the 3D DSL: four comparisons

How to tell whether pxl's 3D layer (fields, builders, `world3d`, local edits, `expect3d`, the part
trace) makes agents better at 3D pixel art, rather than only making the code run. The four
comparisons are the dsl3d plan's (§6.6), in the spirit of BlenderGym: a task is done when the
requested change happened and nothing else did, not when the file builds. One small instance of the
second comparison was run (below); the rest is a protocol ready to run.

## Contents

- [What every comparison shares](#what-every-comparison-shares)
- [1. Generic primitives vs semantic builders](#1-generic-primitives-vs-semantic-builders)
- [2. Full rewrite vs local edit](#2-full-rewrite-vs-local-edit)
- [3. Fixes by the model alone vs numeric, local fixes](#3-fixes-by-the-model-alone-vs-numeric-local-fixes)
- [4. A screenshot vs a screenshot and the execution trace](#4-a-screenshot-vs-a-screenshot-and-the-execution-trace)
- [A first run: the grove's edit, rewritten and edited](#a-first-run-the-groves-edit-rewritten-and-edited)

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
  time, re-running the check; or no agent at all, a search over that one number until the rule
  holds (model calls: zero).
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

## A first run: the grove's edit, rewritten and edited

Comparison 2, one task, one run an arm, Claude Sonnet 5.5 at low effort (the cheapest that could do
it), on pxl as of the commit that adds this file, before the range check it led to. The start scene and the two briefs are in
[`study/eval3d/`](study/eval3d); the request: "a denser canopy, twistier branches, wind from the left,
a bluish ground mist". Scored with `scripts/eval3d.ts --touch oak,smoke,mist`, four moments of the
loop.

| | Rewrite (A) | Local edit (B) |
|---|---:|---:|
| Cost, turns, time | $0.23, 10, 35 s | $0.15, 8, 49 s |
| Input-token units (`tokens.ts`) | 131k (reference.md read whole: 71% of what was read again) | 89k |
| What it changed | wind left; oak `canopy` 1.5, `leaves` 34, `twist` 1.6, `limbs` 5; mist blue | wind left; oak `canopy` 1.5, `twist` 70; mist blue |
| Unintended changes (house, rock: 17,348 px) | 0 | 0 |
| Canopy, leaves px (start 8,590, 8,263) | 8,833, 14,526 | 12,611, 12,724 |
| Mist's mean color | grey to `#a6c0dc` | grey to `#a6c0dc` |
| Smoke's middle x (wind from the left) | 200 to 213 | 200 to 213 |
| Expects held | 6 of 6 | 6 of 6 |

What it says, as a first measure:

- **The scene as data kept the approved parts in both arms.** Even writing the file anew, the agent
  kept the parts' builders, seeds and places, so the house and the rock came out byte for byte. The
  protection is in `world3d` (named parts, a seed each), not in the agent's restraint; the
  comparison that would show a difference is a scene of raw primitives rewritten (comparison 1's arm
  A, then 2 on it).
- **The rewrite did more than asked** (5 limbs instead of 3, a structural change no one requested)
  and cost half again as much, reading the whole reference.
- **The local edit guessed a parameter's range wrong**: `twist: 70`, where twist is radians from 0
  to 1.5; the limbs wrapped round to an arbitrary kink instead of a twistier one. Fixed in pxl: the
  reference now gives each tree parameter's range and default, and a value out of range is refused
  with them (`make3d.tree: twist is 0 to 1.5 (default 0.35), got 70`).

Doing it again, from the repository:

```sh
mkdir -p runs/rewrite/sonnet-low runs/edit/sonnet-low
for a in rewrite edit; do
  cp docs/study/eval3d/grove.px.js examples/sdf/kit.px.js runs/$a/sonnet-low/
  sed "s|<pxl>|$PWD|g" docs/study/eval3d/$a.txt > runs/$a.txt
  scripts/model-study.sh runs/$a.txt runs/$a sonnet low &
done; wait
for a in rewrite edit; do
  node scripts/eval3d.ts docs/study/eval3d/grove.px.js runs/$a/sonnet-low/grove.px.js grove --touch oak,smoke,mist
done
```
