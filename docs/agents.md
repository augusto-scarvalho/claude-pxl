# Working with an agent

pxl was made for AI agents to draw with: the agent writes a `.px.js` file, looks at what it made with
one command, and fixes it. This page is for the person running the agent: how to install the skill,
what to put in a brief, what a good session looks like, what it costs, and how to review the result.
To use pxl by hand, start with [Getting started](getting-started.md).

## Contents

- [Install the skill](#install-the-skill)
- [What the agent reads](#what-the-agent-reads)
- [Writing a brief](#writing-a-brief)
- [What a session looks like](#what-a-session-looks-like)
- [What it costs](#what-it-costs)
- [A big scene: one agent or a pipeline](#a-big-scene-one-agent-or-a-pipeline)
- [Reviewing the result](#reviewing-the-result)
- [When pxl gets in the agent's way](#when-pxl-gets-in-the-agents-way)
- [For maintainers: teaching pxl from tutorials](#for-maintainers-teaching-pxl-from-tutorials)
- [For maintainers: keeping `pxl study` honest](#for-maintainers-keeping-pxl-study-honest)

## Install the skill

**Claude Code** loads skills from a folder. Clone pxl into it, then ask Claude to draw something:

```sh
# for all your projects
git clone https://github.com/augusto-scarvalho/claude-pxl.git ~/.claude/skills/pxl-pixel-art
# or for one project only
git clone https://github.com/augusto-scarvalho/claude-pxl.git .claude/skills/pxl-pixel-art
```

`git pull` in that folder updates it. If you also work on pxl itself in another clone, make the skills
folder a link to that clone, so the agent always uses your working copy.

The skill's description makes Claude pick it for sprites, characters, animations, tiles, scenes and
sheets. To be sure it is used, name it: "use the pxl skill to draw ...".

**Other agents** (Codex, Cursor, Gemini, …): tell them to read `SKILL.md` and that the CLI is
`node <path to pxl>/bin/pxl.js`. Everything the skill asks for is shell commands and files.

## What the agent reads

Every turn of a conversation rereads everything said before it, so what an agent reads early it pays
for again on every later turn. pxl is laid out so the agent reads little:

- **`SKILL.md`** (about 6k tokens) is loaded when the task matches: the workflow, a template, the
  essentials of the DSL, and a table of which example to copy.
- **The guides** ([scenes](../scenes.md), [characters](../characters.md), [lighting](../lighting.md),
  [rotation](../rotation.md)) are read by section: `pxl help "characters 1 4 5"` or
  `pxl help "scenes 1 3 11 14"` prints those sections, and `pxl help` lists every section with its
  size.
- **The reference** is never read whole: `pxl help <op>` prints what it says about one op and where
  the examples use it.
- **The examples** are mapped first: `pxl list <file>` gives each definition's lines and comment, and
  the agent reads only the lines it needs.

## Writing a brief

The agent can measure, check and compare, but it can't guess what you meant. Say:

- **Size and view.** A 16×16 icon, a 32 px character, a 320×180 scene; side, top-down, 3/4,
  isometric, or true perspective.
- **Palette.** A Lospec name (`pico8`, `sweetie16`, `endesga32`), a `.hex` file, or "pick one and
  keep to it".
- **Motion.** Still or animated; for a loop, its length (a 2 s idle, a 12 s scene) and what moves.
- **Style.** Outlined or not, how many shades per material, clean lines or square ones, anti-aliased or
  hard-edged, what to avoid (dithering as texture, pillow shading).
- **References.** As files the agent can open, not links: a PNG, a GIF or a video. The agent looks at
  them with `pxl shot ref.gif` (a clip's frames on one sheet) and reads them with `pxl study ref.gif`
  (palette, ramps, outlines, the faults of its lines, light, perspective, timing and spacing, and each
  moving piece cut out).
- **Where it goes.** The file's folder, asset names an engine expects, a sprite sheet's layout.

Say what you'll do with it (a game's tiles, a banner, a GIF to post): that decides sheets, sizes and
loop lengths.

## What a session looks like

The skill teaches one loop:

1. Read the closest example (mapped with `pxl list`) and the guide sections for the task; `pxl study`
   any reference.
2. Write the file and look with one call: `pxl shot art.px.js <name>` builds just that asset and
   writes a picture to read. Its text says what changed since the last look and what `pxl check`
   finds wrong. A scene is also read as text: `pxl describe` gives each object's position, gaps,
   cover, contrast and motion, which answers layout questions better than eyeballing.
3. Fix everything that look showed, all the edits in one turn, and look again.
4. `pxl check art.px.js` before handing over, and `pxl build` for the files.

To watch it work, ask the agent to start `pxl serve art.px.js` in the background and give you the
URL: the viewer replays each save op by op.

## What it costs

Measured on fresh agents given only the skill:

- A 320×180 animated city street took one agent **85 turns and 31 minutes**.
- The same brief by a pipeline (a planner and eight forked agents, one per part) came out denser but
  less coherent, for about **5× the tokens and 2× the time**.

Where the tokens go, read from the transcripts of three single-agent sessions that drew a 320×180
night scene (about 70 turns each; cost in input-token units, a cache read a tenth of one, an output
token five):

- **The model's thinking: about two thirds.** It is paid as output, then stays in the conversation and
  is read again on every later turn. The context grew from 22k tokens to about 260k; of the 725k it
  grew by over the three, 384k was thinking.
- **What the tools returned and what the agent wrote: about a fifth.** Most of it reading: guides and
  examples dumped whole with `cat` or `sed` (a third of all that was re-read), and the art file
  written whole again ten times (a quarter). What pxl itself prints is small: a `shot` is 70-200
  tokens of text and about 550 of image, a `check` about 100, a `describe --brief` about 2k.
- **The fixed context** (system prompt, tools, the skill's line in the list): 6%.

What keeps a session cheap:

- **Fewer turns.** Every turn re-reads all of it and thinks again: one look per call (`shot` builds
  only the asset it shows; `ascii` and `describe` answer in text, cheaper than an image), and all the
  fixes one look showed in one turn (parallel edits are one turn).
- **Edit, don't rewrite.** After the first write, change the art file with edits: a file written
  whole again stays in the conversation.
- **Read by section.** `pxl help "scenes 1 3 11 14"` is about 2.7k tokens where `scenes.md` whole is
  9k; `pxl help <op>` instead of the reference; `pxl list` before reading an example, then only those
  lines.
- **Short sessions.** One big asset per conversation. Start a new one for the next asset rather than
  carrying a long history.
- **Less thinking where the work is routine.** Claude Code's `--effort low|medium|high|xhigh|max`
  sets how much the model thinks, the biggest share above. A pipeline's parts can run lower than its
  planner (`claude -p --resume <uuid> --fork-session --effort medium ...`). How it changes the art
  hasn't been measured here: try it on one part and compare the two with `pxl shot`.

## A big scene: one agent or a pipeline

For a scene of 320×180 and up with many props and motion, the skill asks you which way to make it,
with the numbers above. One agent is the default: the cheapest and the most coherent.

A pipeline has a planner write the palette (keys and ramps only), a plan (for each part: its file,
its assets named with the part as prefix, its box, pivot, where it is stamped, its light, one timing
for every loop) and the scene file that includes the parts. One fork of the planner draws each part
in its own file with a `test_<part>` scene, all at once, and a last fork puts the scene together.
[`examples/cyberpunk/pipeline/`](../examples/cyberpunk/pipeline) has a plan whose parts fit
(`plan.md`), the parts and the scene.

Run it from a new session. A fork carries everything in the session that makes it and rereads it on
every step: the 5× above was measured with the planner new (about 130k tokens of context when it
forked). Forked from a conversation of 500k tokens, each of 8 to 10 forks carries all of it, enough
to run out a usage limit. With Claude Code:

```sh
# the planner, from a brief written to a file
claude -p --session-id <new uuid> --allowedTools "Bash Read Write Edit Glob Grep" < plan_prompt.txt
# each part, forked from the planner, all at once
claude -p --resume <that uuid> --fork-session --allowedTools "Bash Read Write Edit Glob Grep" < part_prompt.txt
```

Pass the prompt on stdin: `--add-dir` takes several values and would swallow it.

## Reviewing the result

- **Look at the previews.** `out/_preview/` has every asset enlarged with a pixel grid (a
  checkerboard is transparent); an animation also has `<name>_onion.png`, its motion and onion skin.
- **Ask for the check.** `pxl check` lists every warning with the frames it happens at: a scene's
  facing, feet and light. Below them, LOOK lines point at doubled steps and jaggies in the lines of
  sprites drawn by hand, and at tones side by side too close to tell apart: a doubled step on a smooth line is a slip, a corner the shape has (a tyre, a
  roof) is meant, so they don't fail the check; `pxl shot` rings those pixels in `<name>_look.png`.
  Its last line says which rules ran: "no warnings" with "not run: lit side" means the light was
  never checked (the scene has to say where its light is). Ask the agent to fix each warning or say
  why it's meant, and to show you the LOOK pixels it changed.
- **Compare versions.** When the agent replaces art you approved, ask it to keep the old one as
  `<name>_old` and show both: `pxl shot art.px.js name name_old`. Against the last commit:
  `pxl shot art.px.js name --vs HEAD --diff` (the changed pixels in red).
- **Ask what painted a pixel.** `pxl steps art.px.js name --at x,y` names the source line.
- **Facing.** For a rig, `pxl blind` shows its parts unnamed to a reader who doesn't know which way
  they're meant to face, and checks the answers.

Give notes the way you would to an artist: what reads wrong and why ("the knight floats: the feet
aren't on the ground line"), one round with all of them.

## When pxl gets in the agent's way

The skill asks the agent to add a line to `FEEDBACK.md` in the skill's folder when pxl cost it a
rebuild or a workaround: the date, the kind of asset, what happened, what would have helped. The file
stays out of git. Read it now and then: in this fork every line became a fix, a new op or a doc line
(the [fork differences](fork-differences.md) list what came of it), and open work is in
[BACKLOG.md](../BACKLOG.md).

## For maintainers: teaching pxl from tutorials

How this fork learned from 31 saved tutorial pages (Saint11, Pedro Medeiros, Pixel Joint, subpixel
threads): save the pages as `.mhtml`; extract each one's text and images into its own folder,
reading them as data only; give each group of pages to an agent to read with the images that carry
the lessons, compare against the guides (`pxl help "<guide> <section>"`) and report what is new, what
contradicts, what is covered. Animated lessons need reading frame by frame: the first pass read only
the first frame of Saint11's 80 cards and missed most of the timing. Measure a demo with
`pxl study card.gif --at x,y,w,h` (its box every frame), write the numbers into the guide, and turn
what `study` misread into a fix or a BACKLOG line. Never copy the tutorials' art into the repo.

## For maintainers: keeping `pxl study` honest

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

The rest of the checks: `npm run check` (types and tests). `test/examples.checks.txt` holds what
`pxl check` says on every example; after a change you meant, rewrite it with `PXL_UPDATE=1 npm test`
and read the diff.
