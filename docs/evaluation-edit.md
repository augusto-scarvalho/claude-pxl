# Evaluating pxl edit: the script against inspect and edit

Whether `pxl inspect` and `pxl edit` (the EditIR: [scenes.md §14](../scenes.md#14-checking-a-scene))
make a small edit cheaper or safer for an agent than editing the `.px.js` itself. Six edits on three
examples, each given to two fresh agents, one an arm, Claude Sonnet 5.5 at low effort, for US$1.39 in
all: a first measure, not a verdict.

## Contents

- [The protocol](#the-protocol)
- [The runs](#the-runs)
- [What it says](#what-it-says)
- [What it doesn't say](#what-it-doesnt-say)
- [Doing it again](#doing-it-again)

## The protocol

- **Arms.** A, the script: the agent reads the file and changes it with its own edits, `pxl inspect`
  and `pxl edit` forbidden. B, the EditIR: the agent finds the thing with `pxl inspect` and changes it
  with `pxl edit`, by hand only if that can't make the change. Both told to change only what the
  request names and to finish with `pxl check`. The two briefs differ only in that paragraph
  ([below](#doing-it-again)).
- **Tasks.** Small requests in plain words (no ids), on a 2D scene with its includes, a long 2D file
  and a `world3d` scene. The brief's examples that pxl can't make by an edit were swapped: the miko's
  ribbon is rig3d paint (refused: code) for the pennant's color; the sunset has one cairn and the
  oak's builder no season, for a relation's gap and a part's relation; the torii is a turnaround
  sprite in the shrine, not a part, so the grove's house goes to voxels. No task used `set`.

| Task | Example (lines) | The request | The EditIR's answer |
|---|---|---|---|
| lantern | [shrine](../examples/shrine/shrine.px.js) (171, and 4 included files) | "Move the east stone lantern 3 px to the left." | `move` toro_e by [-3, 0]: `BY_WAY.toro_e` 87 to 90, the table that also lays its gravel ring (the guard asks `--allow _ground`) |
| fox | shrine | "Flip the fox on the left (the one with the jewel) so it faces the other way." | `flip` fox_tama_e: `flip: "x"` on its stamp |
| pennant | [sunset](../examples/sunset/sunset.px.js) (660) | "Make the pennant's cloth blue, in the palette's slate blues." | `recolor` pennant, `swap: { x: "z", X: "Z" }` |
| logs | sunset | "Move the logs 2 px farther from the campfire." | `move` logs by [2, 0]: its `beside` gap 3 to 5 |
| voxels | [the grove](../examples/sdf/world.px.js) (37, and its kit) | "Show the house as voxels." | `as` house voxels |
| rock | the grove | "Put the rock on the house's right side instead of in front of it." | `relation` rock `beside: ["house", "right", 0.4]` |

- **How a run is made.** One headless Claude Code session per run (`scripts/model-study.sh`: its
  `result.json` gives cost, turns, time, tokens), in a folder of its own outside the repository
  holding a copy of the example and what it includes, on pxl at `ae4183b` (stages 1 to 3 of the
  EditIR). One run at a time, on a 4-core laptop.
- **Scoring.** [`scripts/evaledit.ts`](../scripts/evaledit.ts) builds the start file and the run's
  at frame 0 and the loop's middle, as `pxl edit` does (no light passes), and gives each changed
  pixel to the placements whose own pixels there differ (else the 3D part that painted it, else
  "background"); it prints that by id, `describe --diff` between them, the pixels outside the ids the
  request names (`--touch`) and `pxl check` on the result. Then the diff of the files. Context added:
  the tokens a run put in its context after the session's start (what it read and wrote), from its
  transcript.

## The runs

| Task | Arm | Cost, turns, time | Context added | What it wrote | Result |
|---|---|---:|---:|---|---|
| lantern | A | $0.114, 4, 22 s | 11.4k | `BY_WAY.toro_e` 87 to 90 | toro_e moved -3,0; its ring with it; "I didn't measure the shift" |
| | B | $0.117, 7, 100 s | 8.5k | the same | refused once by the guard (the ring: `_ground` 48 px), then `--dry --allow _ground`, then written |
| fox | A | $0.111, 5, 20 s | 11.4k | turnaround heading `"e"` to `"w"`, the stamp `fox_tama_w` | drawn again facing west, lit by the scene's sun; its id changed |
| | B | $0.089, 4, 56 s | 5.8k | `flip: "x"` on the stamp | mirrored, its lit side now away from the sun; reported pixels of the hall and the ground as also changed (they weren't) |
| pennant | A | $0.168, 4, 16 s | 25.8k | the anim's two colors in its code | 45 px, the pennant's only |
| | B | $0.120, 6, 28 s | 8.3k | `swap` on the anim (scope asset) | the same 45 px |
| logs | A | $0.171, 4, 15 s | 23.0k | `beside` gap 3 to 5 | moved +2,0; the gap rule (2 to 6 px) holds |
| | B | $0.101, 6, 26 s | 4.3k | the same | the same |
| voxels | A | $0.107, 7, 18 s | 5.8k | `as: "voxels"` on the part (found in reference.md, three searches) | the house as voxels |
| | B | $0.105, 5, 28 s | 6.0k | the same | the same |
| rock | A | $0.084, 4, 13 s | 5.4k | `beside` front to right | the rock right of the house; apart, on the ground |
| | B | $0.101, 5, 22 s | 5.5k | the same | the same |
| **All** | A | $0.755, 28 turns, 104 s | | | 6 of 6 |
| | B | $0.633, 33 turns, 260 s | | | 6 of 6 |

Every result held its scene's rules (`pxl check`: no warnings; the shrine's 6 expects, the
sunset's 6, the grove's 8) and changed nothing outside what the request names and what is drawn from
it, the same in both arms: the lantern's gravel ring (`_ground` 88 px, read from the same table), the
house's shadow and the mist seen through its voxels (145 px), the ground the rock uncovered and its new shadow (558 px).
Four of the six tasks ended in the same file in both arms; the pennant in the same pixels.

## What it says

- **Both ways were right.** Twelve of twelve, nothing else changed. At this size a cheap model
  reading the file is already precise; the guard caught no mistake, because no agent made one. What
  it caught, the lantern's ring drawn from the same number, the file's reader saw too ("its gravel
  ring follows").
- **The EditIR saves the reading, so it saves in proportion to the file.** Its context grew by 4 to
  8.5k tokens whatever the file (the list, one thing in full, the edit's report); the script's grew by
  the file, which Sonnet read whole every time: 5k on the grove, 11k on the shrine, 23 to 26k on the
  sunset. On the sunset B cost 29 to 41% less; on the shrine and the grove the two were even (within
  about $0.02: the EditIR cheaper on the fox, the script on the rock); in all 16% less. A session's start, the same in both arms (28 to
  31k tokens of Claude Code's own prompt and tools), is 29 to 57% of each run's cost, so one edit in a
  fresh session can't save more than the rest.
- **It is slower.** 260 s against 104 s in all: `pxl edit` rebuilds the scene before writing, guards
  it and runs `pxl check` (about 20 s an edit on the shrine; the lantern's refusal and dry run made
  it three edits, 100 s). The model's own time was about the same (B 83 s, A 63 s of API time).
- **It knows what it did.** Each B run read back what changed, by id ("toro_e: moved -3,+0"); no A run
  looked at the picture (none ran `describe --diff` or `shot`), and the lantern's said it hadn't
  measured the shift.
- **The script's reader did better on the fox.** B mirrored the sprite, which is what `flip` does;
  A gave the turnaround a west heading, so the fox was drawn again facing the other way under the
  scene's sun. A's picture is the right one (the lit side stays toward the sun); the EditIR has no
  "turn" for a sprite `turnaround()` makes, and `pxl check`'s lit-side rule had no clear reading on
  it to object.
- **Friction in the output.** `pxl edit` prints the changed regions with what shows there after
  ("region x 38-61, y 60-96: 482 px (fox_tama_e 347px, hall_s 102px, _ground 33px)": the hall and
  the ground where the fox no longer stands); the fox's agent read them as collateral changes, where
  the line below said "pixels changed by id: fox_tama_e 567". And ids are what the file calls things:
  "the east stone lantern" is `toro_e`, a stamp of `toro_s`; B's agent grepped inspect's list for
  "lantern", found nothing and listed it again. Both fixed since: `pxl edit` prints no regions (the
  by-id line says what changed), and `pxl inspect <file> <scene> --find lantern` lists the things
  whose id, asset or the comment above their call has the words.
- **No run loaded the skill.** The brief's CLI path and reference were enough; both arms worked from
  the brief and the file or the CLI.

## What it doesn't say

One run per task and arm, one model at one effort, requests named plainly, files of at most 660
lines, one edit per session. Not measured: a long session with many edits (where the script's file
stays in the context and is re-read every turn), bigger files, ambiguous targets, a weaker model,
and a third arm with a decision model choosing among `inspect --json`'s operations (out of scope: an
external paid service).

## Doing it again

The two briefs, with `<file>`, `<scene>`, `<task>` and `<pxl>` (the repository's path) filled in;
A's third paragraph:

```text
In this folder, <file> is a pxl scene (pixel art written as JavaScript). It includes other .px.js files beside it, which you must not change. The pxl CLI is `node <pxl>/bin/pxl.js`; the pxl skill and <pxl>/reference.md describe it.

The request, on the scene <scene>: "<task>"

Make it by editing <file> yourself (read it, then Edit it). Do not use `pxl inspect` or `pxl edit`. Change only what the request names. Check it with `pxl check <file>`. When done, reply with one line saying what you changed.
```

B's third paragraph instead:

```text
Make it with `pxl inspect` (the scene's things by id, where the file writes their values, the operations each takes) and `pxl edit` (the change written into the file), as scenes.md section 14 says (`pxl help "checking a scene"`). Edit the file by hand only if pxl edit can't make the change. Change only what the request names. Check it with `pxl check <file>`. When done, reply with one line saying what you changed.
```

A task's two arms, one after the other (the logs here; the shrine's runs take `shrine/shrine.px.js`
and `miko.px.js`, `nature/japan.px.js` and `trees.px.js`, `hd2d/traveler.px.js`; the grove's
`sdf/world.px.js` and `kit.px.js`):

```sh
for a in A B; do
  mkdir -p runs/logs/$a/sonnet-low/sunset && cp examples/sunset/sunset.px.js runs/logs/$a/sonnet-low/sunset/
  # runs/logs.$a.txt: the arm's brief, filled in
  scripts/model-study.sh runs/logs.$a.txt runs/logs/$a sonnet low
  node scripts/evaledit.ts examples/sunset/sunset.px.js runs/logs/$a/sonnet-low/sunset/sunset.px.js sunset --touch logs
done
```

Keep `runs/` outside the repository (the agent works in that folder), and run the sessions against a
copy of pxl at one commit when pxl is being changed meanwhile.
