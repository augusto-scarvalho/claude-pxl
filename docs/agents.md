# Working with an agent

pxl was made for AI agents to draw with: the agent writes a `.px.js` file, looks at what it made with
one command, and fixes it. This page is for the person running the agent: installing the skill,
picking the model, writing a brief, how the agent works and what a session costs, and reviewing the
result. To use pxl by hand, start with [Getting started](getting-started.md).

## Contents

- [Install the skill](#install-the-skill): Claude Code, the Codex CLI, Antigravity's `agy`, others
- [Pick the model and effort](#pick-the-model-and-effort)
- [Writing a brief](#writing-a-brief)
- [How the agent works](#how-the-agent-works): look, fix in one turn, check
- [What it costs](#what-it-costs), and how to keep it cheap
- [A big scene: one agent or a pipeline](#a-big-scene-one-agent-or-a-pipeline)
- [Reviewing the result](#reviewing-the-result)
- [When pxl gets in the agent's way](#when-pxl-gets-in-the-agents-way): the `FEEDBACK.md` loop
- [For contributors](#for-contributors): tests, tutorials, calibrating `pxl study`, speed, measuring
  sessions

## Install the skill

**Claude Code** loads skills from a folder. Clone pxl into it, then ask Claude to draw something:

```sh
# for all your projects
git clone https://github.com/augusto-scarvalho/claude-pxl.git ~/.claude/skills/pxl-pixel-art
# or for one project only
git clone https://github.com/augusto-scarvalho/claude-pxl.git .claude/skills/pxl-pixel-art
```

`git pull` in that folder updates it. If you also work on pxl itself in another clone, make the skills
folder a link to that clone, so the agent always uses your working copy:

```sh
ln -s <your clone> ~/.claude/skills/pxl-pixel-art                       # macOS, Linux
mklink /J %USERPROFILE%\.claude\skills\pxl-pixel-art <your clone>      # Windows, in cmd
```

The skill's description makes Claude pick it for sprites, characters, animations, tiles, scenes and
sheets. To be sure it is used, name it: "use the pxl skill to draw ...".

**The Codex CLI** loads skills from `~/.codex/skills/` the same way: clone pxl to
`~/.codex/skills/pxl-pixel-art` (or link that folder to your clone). Codex then lists the skill and
reads it when you ask for pixel art.

**Antigravity's CLI** (`agy`) reads skills from `~/.gemini/config/` but doesn't follow a link there.
Name your clone in `~/.gemini/config/skills.json` instead:

```json
{"entries": [{"path": "<the folder holding your clone>", "include_only": ["<your clone's folder name>"]}]}
```

`agy` then lists `pxl-pixel-art` among its skills.

**Other agents** (Cursor, …): tell them to read `SKILL.md` and that the CLI is
`node <path to pxl>/bin/pxl.js`. Everything the skill asks for is shell commands and files.

## Pick the model and effort

The [model study](model-study.md) gave one 160×120 animated scene to seventeen fresh agents, each on
a different model or effort level, and a curator judged the loops:

| For | Use | On the study's scene |
| --- | --- | --- |
| a scene: the sweet spot | Opus at xhigh | $9.62, 34 min; the curator's second, close behind max |
| a scene when cost matters more | Opus at high | $4.71, 22 min; a step down |
| a piece where cost doesn't matter | Opus at max | $20.01, 68 min; the curator's first |
| a draft, a small asset, a quick fix | Opus at medium | $2.17, 9 min |
| a quick draft or a layout to judge | Codex, gpt-6.1-sol at high | about $0.36, 4 min |

- **Effort** sets how long the model thinks and keeps working. On Opus each step up doubled the cost
  and added turns: 14 at low, 42, 75, 122, 187 at max.
- **Sonnet and Haiku** got the scene's space wrong (a keeper bigger than the door, a beam turned
  into the rock), and Sonnet at xhigh cost more than Opus at high. **Fable** at high cost more than
  Opus at high and scored lower.
- **Codex** is far cheaper and faster (about $0.16 to $3.24 a scene, in minutes), but the curator
  found every one of its scenes well below Claude's.
- **Antigravity's Gemini runs** (Gemini 3.8 Flash and Gemini 4 Argon at high, about $1.62 and $3.15,
  42 minutes each) are not judged yet.

Codex and Antigravity ran on plans that report tokens only, so their prices are estimates at API
rates. Each configuration ran once on one brief: read it as a first measure.

To set them:

- Claude Code: `claude --model opus --effort xhigh` (or `/model` inside a session).
- Codex: `codex -m gpt-6.1-sol -c model_reasoning_effort=high`.
- Antigravity: the study ran `agy -p "<brief>" --model gemini-4-argon-high --effort high` (the
  model's name carries the effort too).

## Writing a brief

The agent can measure, check and compare, but it can't guess what you meant. Say:

- **Size and view.** A 16×16 icon, a 32 px character, a 320×180 scene; side, top-down, 3/4,
  isometric, or true perspective.
- **Palette.** A Lospec name (`pico8`, `sweetie16`, `endesga32`), a `.hex` file, or "pick one and
  keep to it".
- **Motion.** Still or animated; for a loop, its length (a 2 s idle, a 12 s scene) and what moves.
- **Style.** Outlined or not, how many shades per material, clean lines or square ones, anti-aliased or
  hard-edged, what to avoid (dithering as texture, pillow shading).
- **References.** As files the agent can open, not links: a PNG, a GIF, a WebP or a video. The agent
  looks at them with `pxl shot ref.gif` (a clip's frames on one sheet) and reads them with
  `pxl study ref.gif` (palette, ramps, outlines, light, perspective, timing, parallax planes, and each
  moving piece cut out; see [Starting from a reference](getting-started.md#starting-from-a-reference)).
- **Where it goes.** The file's folder, asset names an engine expects, a sprite sheet's layout.

Say what you'll do with it (a game's tiles, a banner, a GIF to post): that decides sheets, sizes and
loop lengths.

## How the agent works

`SKILL.md` teaches the agent one loop. Each step is also what to ask for when an agent drifts from
it:

1. **Read only what the task needs.** `pxl help` alone is an index: every op and option, and each
   guide's sections with their size. `pxl help <op>` prints what the reference says about one op and
   where the examples use it; `pxl help "scenes 1 3 11 14"` prints those sections of a guide. An
   example is mapped with `pxl list <file>` first, and only the lines needed are read. A reference
   picture or clip is read with `pxl study ref.gif`. Guides and the reference are never dumped whole.
2. **Look with one call.** `pxl shot art.px.js <name>` builds only that asset and writes a picture
   to read. Its text says what changed since the last shot and what `pxl check` finds on it. Exact
   pixels come as text from `pxl ascii art.px.js <name>`, cheaper than an image. A scene is also read
   as text: `pxl describe art.px.js <scene>` (`--brief` when busy) gives each object's position, gaps,
   cover, contrast and motion, which answers layout questions better than eyeballing; after an edit,
   `--diff` lists what it moved, redrew or recolored.
3. **Fix everything one look showed, in one turn.** All the edits go out as parallel tool calls in
   one message, then one look again. Every turn re-reads the whole conversation, so a turn per edit
   is what makes a long session expensive. After the first write the art file is changed with edits,
   not written whole again.
4. **Check, then build.** `pxl check art.px.js` before handing over: the agent fixes each warning or
   says why it's meant. `pxl build art.px.js` writes the files.

Commands run on one of pxl's examples write an `out/` next to it, so the agent gives them
`--out <scratch dir>` to keep the skill's folder clean.

To watch it work, ask the agent to start `pxl serve art.px.js` in the background and give you the
URL: the viewer replays each save op by op.

## What it costs

Measured on fresh agents given only the skill:

- The model study's 160×120 animated scene cost $0.54 on Opus at low (2 minutes) to $20.01 at max
  (68 minutes) in Claude Code; see [Pick the model and effort](#pick-the-model-and-effort).
- A 320×180 animated city street took one agent **85 turns and 31 minutes**. The same brief by a
  pipeline (a planner and eight forked agents) came out denser but less coherent, for about
  **5× the tokens and 2× the time**.

Where the tokens go, read from the transcripts of three single-agent sessions that drew a 320×180
night scene (about 70 turns each; cost in input-token units: a cache read a tenth of one, an output
token five, a token written to the cache two, as Claude Code keeps its cache an hour):

- **The model's thinking: about two thirds.** It is paid as output, then stays in the conversation and
  is read again on every later turn. The context grew from 22k tokens to about 260k; of the 725k it
  grew by over the three, 384k was thinking.
- **What the tools returned and what the agent wrote: nearly a quarter.** Most of it reading: guides and
  examples dumped whole with `cat` or `sed` (a third of all that was re-read), and the art file
  written whole again ten times (a quarter). What pxl itself prints is small: a `shot` is 70-200
  tokens of text and about 550 of image, a `check` about 100, a `describe --brief` about 2k.
- **The fixed context** (system prompt, tools, the skill's line in the list): 6%.

What keeps a session cheap (the skill already asks the agent for the first three; see
[How the agent works](#how-the-agent-works)):

- **Read by section.** `SKILL.md` (about 6k tokens) is loaded when the task matches. `pxl help
  "scenes 1 3 11 14"` is about 3k tokens where `scenes.md` whole is 12k.
- **Edit, don't rewrite.** A file written whole again stays in the conversation.
- **Fewer turns.** One look per call, and all the fixes one look showed in one turn.
- **One big asset per conversation.** Start a new conversation for the next asset rather than
  carrying a long history.
- **The right effort.** Thinking is the biggest share, and effort sets it: medium for drafts and
  small fixes, xhigh for a scene you'll show.

## A big scene: one agent or a pipeline

For a scene of 320×180 and up with many props and motion, the skill has the agent ask you which way
to make it, with the numbers above and how long the conversation already is. One agent is the
default: the cheapest and the most coherent (85 turns and 31 minutes for the city street).

A pipeline has a planner write the palette (keys and ramps only), a plan (for each part: its file,
its assets named with the part as prefix, its box, pivot, where it is stamped, its light, one timing
for every loop) and the scene file that includes the parts. One fork of the planner draws each part
in its own file with a `test_<part>` scene, all at once, and a last fork puts the scene together.
Included files share one scope, so every top-level name in a part starts with the part's name.
[`examples/cyberpunk/pipeline/`](../examples/cyberpunk/pipeline) has a plan whose parts fit
(`plan.md`), the parts and the scene. It came out denser than one agent's street but less coherent,
for about 5× the tokens and 2× the time.

Run it from a new session. A fork carries everything in the session that makes it and rereads it on
every step: the 5× above was measured with the planner new (about 130k tokens of context when it
forked). Forked from a conversation of 500k tokens, each of 8 to 10 forks carries all of it, enough
to run out a usage limit. Only while a session is still short is a fork of it (Claude Code's Agent
tool, `subagent_type: "fork"`) as cheap. With Claude Code, the planner at xhigh and each part at
high:

```sh
# the planner, from a brief written to a file
claude -p --session-id <new uuid> --effort xhigh --allowedTools "Bash Read Write Edit Glob Grep" < plan_prompt.txt
# each part, forked from the planner, all at once
claude -p --resume <that uuid> --fork-session --effort high --allowedTools "Bash Read Write Edit Glob Grep" < part_prompt.txt
```

Pass the prompt on stdin: `--add-dir` takes several values and would swallow it.

## Reviewing the result

- **Look at the previews.** `out/_preview/` has every asset enlarged with a pixel grid (a
  checkerboard is transparent). An animation also has `<name>_onion.png`, its motion and onion skin;
  a sheet of animations has a GIF that plays them all.
- **Ask for the check.** `pxl check` lists every warning with the frames it happens at: a scene's
  facing, feet and light. Below them, LOOK lines point at doubled steps and jaggies in the lines of
  sprites drawn by hand, and at tones side by side too close to tell apart. They don't fail the
  check: a doubled step on a smooth line is a slip, a corner the shape has (a tyre, a roof) is meant.
  `pxl shot` rings those pixels in `<name>_look.png`. The check's last line says which rules ran:
  "no warnings" with "not run: lit side" means the light was never checked (the scene has to say
  where its light is). Ask the agent to fix each warning or say why it's meant, and to show you the
  LOOK pixels it changed.
- **Check the values.** `pxl shot art.px.js name --grey` adds the picture in greys: whether the
  planes read by light and dark before color.
- **See the guides.** `pxl shot art.px.js name --ref` draws the asset's `ref: true` layers over it
  (guide rows, a skeleton), to see whether the figure keeps to them.
- **Compare versions.** When the agent replaces art you approved, ask it to keep the old one as
  `<name>_old` and show both: `pxl shot art.px.js name name_old`. Against the last commit:
  `pxl shot art.px.js name --vs HEAD --diff` (the old version above, the changed pixels in red).
- **Ask what painted a pixel.** `pxl steps art.px.js name --at x,y` names the source line.
- **Facing.** For a rig, `pxl blind` shows its parts unnamed to a reader who doesn't know which way
  they're meant to face, and checks the answers.

Watch the loops yourself: in the model study, an agent judging stills ranked two Codex scenes first,
and the curator, watching the loops, put every Codex scene below Claude's. Give notes the way you would to an artist: what
reads wrong and why ("the knight floats: the feet aren't on the ground line"), one round with all of
them.

## When pxl gets in the agent's way

The skill asks the agent to add a line to `FEEDBACK.md` in the skill's folder (creating it if
missing) when pxl cost it a rebuild or a workaround: a misleading error, a missing op, a doc that sent
it wrong, a trap. Each line has the date, the kind of asset, what happened in pxl and what would have
helped; pxl's side only, never your project. The file stays out of git. Read it now and then and
turn each line into a fix, a new op or a doc line: in this fork every line became one (the
[fork differences](fork-differences.md) list what came of it). Open work is in
[BACKLOG.md](../BACKLOG.md).

## For contributors

The scripts below are in `scripts/`; the README's [Development](../README.md#development) section
lists them.

### Tests

While you iterate, run only the test file for what you changed:

```sh
node --test test/docs.test.ts           # the commands and flags the docs cite, the sections SKILL.md names
```

`npm run test:quick` runs every test but the two slowest (the check of every example and the study
of the gallery's GIFs), about 20 s. Run `npm run check` (types and every test, about 45 s) once
before a commit, not after each edit: the full suite is mostly those two, and a change to a check,
the study or an example is what they catch.

`test/examples.checks.txt` holds what `pxl check` says on every example. After a change you meant
that adds or removes a warning, rewrite it and read the diff:

```sh
PXL_UPDATE=1 node --test test/examples.test.ts
```

### Teaching pxl from tutorials

How this fork learned from 31 saved tutorial pages (Saint11, Pedro Medeiros, Pixel Joint, subpixel
threads), and again from 50 more (SLYNYRD's Pixelblog, final boss blues, Les Forges' course, So You
Want To Be A Pixel Artist?):

1. Save the pages as `.mhtml`.
2. Extract each one's text and images into its own folder, reading them as data only:
   `node scripts/mhtml.ts <folder> <out folder>`.
3. Give each group of pages to an agent to read with the images that carry the lessons, compare
   against the guides (`pxl help "<guide> <section>"`) and report what is new, what contradicts,
   what is covered.
4. Read animated lessons frame by frame: the first pass read only the first frame of Saint11's 80
   cards and missed most of the timing. Measure a demo with `pxl study card.gif --at x,y,w,h` (its box
   every frame) and write the numbers into the guide.
5. Turn what `study` misread into a fix or a BACKLOG line.

Never copy the tutorials' art into the repo.

### Keeping `pxl study` honest

`pxl study` takes animations apart into pieces. `scripts/calibrate.ts` measures how well, against the
examples' own source: where each stamped thing really is in every frame, and which pixels change only
because the light does.

```sh
node scripts/calibrate.ts --summary                     # a line per scene
node scripts/calibrate.ts party -v                      # one scene, every thing it holds
node scripts/calibrate.ts --save before.json            # keep a run
node scripts/calibrate.ts --vs before.json              # compare with a kept run
node scripts/calibrate.ts --vs HEAD~1                   # or with another revision, run in its own worktree
node scripts/calibrate.ts sunset --map maps/            # draw where the light was found right and wrong
```

Each line gives the scene's moving things, the share of their frames study found, how many were found
as light or only loosely, how well the cut-out masks match (precision and recall), and how much of the
light was found. `--vs` prints each line as before → now and the things whose score moved most. Run it
before and after any change to `src/core/study.ts`, `decompose.ts`, `relight.ts` or `vision.ts`; a
change that helps one scene often costs another.

### Keeping pxl fast

Agents run `pxl shot`, `check` and `study` many times a session, and the test suite runs `check` on
every example: a slow path costs every turn. Before and after a change to the engine:

```sh
npm run check                                           # types and tests, about 45 s (test:quick ~20 s)
node scripts/perf.ts                                    # pxl check's time and peak memory on every example
node scripts/hashes.ts examples/hd2d/*.px.js > a.txt    # every asset's hash: diff it after, nothing should move
node --cpu-prof --cpu-prof-dir=prof bin/pxl.js study clip.gif --no-out
node scripts/cpuprofile.ts prof                         # where that time went, by function
```

`pxl build --profile` names the slow functions of one art file's build. Keep a new test to what it
checks: a few frames, a small picture, `study --seconds` for part of a long clip.

### Measuring sessions and models

```sh
# where one Claude Code session's tokens went, from its transcript (several files add up: a pipeline)
node scripts/tokens.ts ~/.claude/projects/<folder>/<session id>.jsonl
# one run of a model study: the brief to a new headless session in a folder of its own
scripts/model-study.sh <brief.txt> <runs folder> <model> <effort> [claude|codex|agy]
```

`tokens.ts` splits the cost by what it paid for (thinking, tool results, the fixed context), then
lists each kind of tool result by how much of the context it took and how often later turns re-read
it. `model-study.sh` keeps each run's result, the pxl commit it read, and its start
and end times. [Doing it again](model-study.md#doing-it-again) has the whole study's commands.
