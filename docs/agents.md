# Working with an agent

pxl was made for AI agents to draw with: the agent writes a `.px.js` file, looks at what it made with
one command, and fixes it. This page is for the person running the agent: installing the skill,
picking the model, writing a brief, how the agent works and what a session costs, and reviewing the
result. To use pxl by hand, start with [Getting started](getting-started.md).

## Contents

- [A round, start to finish](#a-round-start-to-finish): the order that works, a line each
- [Install the skill](#install-the-skill): Claude Code, the Codex CLI, Antigravity's `agy`, others
- [Pick the model and effort](#pick-the-model-and-effort)
- [Writing a brief](#writing-a-brief)
- [How the agent works](#how-the-agent-works): look, fix in one turn, a small change by name, check
- [Blocks first, then paint](#blocks-first-then-paint): a new move, a big scene in stages
- [3D as code](#3d-as-code-which-drawer-and-edits-by-name): which drawer for what, edits by name, rules
- [What it costs](#what-it-costs), and how to keep it cheap
- [A big scene: one agent, a fresh one, or a pipeline](#a-big-scene-one-agent-a-fresh-one-or-a-pipeline)
- [Reviewing the result](#reviewing-the-result)
- [When pxl gets in the agent's way](#when-pxl-gets-in-the-agents-way): the `FEEDBACK.md` loop
- [For contributors](#for-contributors): tests, tutorials, calibrating `pxl study`, speed, measuring
  sessions

## A round, start to finish

The order that has worked over this fork's rounds, each step with its section below:

1. **A brief, in a file when the work is big**: what to make, its size and view, the references as
   files, the stages you want to approve ([Writing a brief](#writing-a-brief)). For a round of
   several jobs, one file: a "how we work" part every stage shares (these rules) and a part per
   stage. A fresh agent does one stage, stops and reports; your main session goes over it with you
   and commits.
2. **Stages, each approved before the next**: a new move as flat blocks, a scene's camera and ground
   as blocks, then the props, the people, the light ([Blocks first, then paint](#blocks-first-then-paint)).
3. **Look, fix everything in one turn, check**: the agent reads only the guide sections it needs
   (`pxl help`), looks with one `pxl shot` or `pxl describe`, sends all the fixes in one message, and
   runs `pxl check` before handing over ([How the agent works](#how-the-agent-works)).
4. **Side by side, then your yes**: a change to art you approved is shown before it is kept, the old
   above the new (`pxl shot art.px.js name name_old`, `--vs HEAD --diff`, `--gif` when it moves), and
   applied when you say so. A change to pxl that shouldn't move a pixel is proven byte for byte
   (`node scripts/hashes.ts --vs HEAD` ends in `0 differ`, [Keeping pxl fast](#keeping-pxl-fast)).
5. **A fresh agent for a big scene** when the conversation is already long: the brief file to a new
   session, not more turns here ([A big scene](#a-big-scene-one-agent-a-fresh-one-or-a-pipeline)).
6. **Your notes in one round**, after watching the loops, not the stills
   ([Reviewing the result](#reviewing-the-result)).
7. **Friction to `FEEDBACK.md`**: the agent writes a line when pxl cost it a workaround, and whoever
   curates pxl turns it into a fix ([When pxl gets in the agent's way](#when-pxl-gets-in-the-agents-way)).
8. **One gallery GIF a round**: previewed in a scratch folder (`--out`, `--every`), committed once at
   the end, under 10 MB ([The gallery](#the-gallery)).
9. **Fast tests while working** (the file you touched, `npm run test:quick`, `PXL_EXAMPLES=<folder>`),
   the full suite once before a commit ([Tests](#tests)).
10. **Light on the machine**, which may be a 4-core laptop: one heavy job at a time (a render, a test
    run), long renders in the background; no headless browser (one froze the user's laptop: look at
    a page in the user's own browser, or say what you couldn't check); stop `pxl serve` and anything
    else started in the background before reporting.

## Install the skill

**Claude Code** loads skills from a folder. Clone pxl into it, then ask Claude to draw something:

```sh
# for all your projects
git clone --depth 1 https://github.com/augusto-scarvalho/claude-pxl.git ~/.claude/skills/pxl-pixel-art
# or for one project only
git clone --depth 1 https://github.com/augusto-scarvalho/claude-pxl.git .claude/skills/pxl-pixel-art
```

`--depth 1` leaves out the history (every past version of the gallery's GIFs, several times the
size of the files); `git pull` in that folder updates it. If you also work on pxl itself in another
clone, make the skills folder a link to that clone, so the agent always uses your working copy:

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
- **What must stay true.** "The pot beside the fire, 2 to 6 px", "the lantern in front of the
  hall". The agent places props by a relation (`beside`, `on`, `along`, `apart`), so they follow
  what they go with, and writes the rules as the scene's `expect`: `pxl check` holds them at every
  frame and `--fix` mends one an edit broke.
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
   picture or clip is read with `pxl study ref.gif`. Guides and the reference are never dumped whole:
   what an agent reads early is paid again on every later turn.
2. **Look with one call.** `pxl shot art.px.js <name>` builds only that asset and writes a picture
   to read. Its text says what changed since the last shot and what `pxl check` finds on it. Exact
   pixels come as text from `pxl ascii art.px.js <name>`, cheaper than an image. A scene is also read
   as text: `pxl describe art.px.js <scene>` (`--brief` when busy) gives each object's position, gaps,
   cover, contrast and motion, which answers layout questions better than eyeballing; after an edit,
   `--diff` lists what it moved, redrew or recolored. What is edited later gets an `id` (a stamp's,
   `c.as`'s, a `mesh()` sprite's): describe and `--diff` name it by that, where "lantern #2" would
   change with another lantern stamped before it, and moving it keeps its look.
3. **Fix everything one look showed, in one turn.** All the edits go out as parallel tool calls in
   one message, then one look again. Every turn re-reads the whole conversation, so a turn per edit
   is what makes a long session expensive. After the first write the art file is changed with edits,
   not written whole again.
4. **A small change by name.** Ask in plain words: "move the fish stall a bit left", "make the
   awning red", "put the cat on the crates", "turn the vendor to face the street", "add a lantern
   beside the tea stall", "a denser canopy" on a `world3d` part. The agent finds the thing with
   `pxl inspect art.px.js <scene> --find stall` (the words of its id, its asset, or the comment
   above its call or its asset's definition: the east lantern is `toro_e`, "the fox with the jewel"
   finds `fox_tama_e`), reads it in full with `--id <id>` (where the file writes each value, the
   operations it takes, the siblings that face another way), and previews the change:
   `pxl edit art.px.js <scene> '{ "op": "move", "target": "fish_stall", "by": [-3, 0] }' --dry`
   prints the source lines it would change and what would change in the picture. Without `--dry`
   it writes the number where it lives (the stamp's call, a table it reads, a part's spec), says
   what changed by id (`describe --diff`) and runs `pxl check`. "Add a lantern beside the tea stall"
   is `{ "op": "add", "target": "lantern_3", "like": "lantern_1", "beside": ["tea_stall", "left", 2] }`,
   a new stamp line after the tea stall's. An edit is refused, saying why, when it would change
   anything but its target and what is placed by it (the ground drawn from the same table:
   `--allow <ids>` lets that when meant), when it would change nothing (a flip of a front view drawn
   symmetric), and when code computes the value (that one is made by hand). In a
   [first measure](evaluation-edit.md) this read 4 to 8.5k tokens where reading the file cost its
   size, was as right, and took longer.
5. **Check, then build.** `pxl check art.px.js` before handing over: the agent fixes each warning or
   says why it's meant. `pxl build art.px.js` writes the files.

Commands run on one of pxl's examples write an `out/` next to it, so the agent gives them
`--out <scratch dir>` to keep the skill's folder clean.

To watch it work, ask the agent to start `pxl serve art.px.js` in the background and give you the
URL: the viewer replays each save op by op. An HD scene's long loop plays as each frame is built
when the page asks for it, a second or two a frame.

## Blocks first, then paint

Painting is the slow part, and a pose or a layout that is wrong under the paint costs the painting
too. So judge the shape of the thing before any of it is painted:

- **A new move** (a kneel, carrying a crate, a swing) is first drawn as flat blocks on the figure's
  skeleton, in every direction it will be seen from. [`lib/characters/traveler.px.js`](../lib/characters/traveler.px.js)
  makes `bk_<move>_<dir>` for each of its moves: the head yellow with a red patch where the face is,
  the body orange, the right limbs light and the left dark. Ask for them as a GIF
  (`pxl shot art.px.js bk_kneel_s bk_kneel_w bk_kneel_n --gif`), approve the pose and the timing, then
  have it painted. The harbor's dockhand carries his crate low because the blocks showed the other
  ways wrong: held up under the chin he read as a sleepwalker.
- **A big scene** goes in stages, each shown and approved before the next: the camera and the ground
  as flat blocks, then the big props, then the people and what they do, then the light and the
  finish. Changing the camera after the props are painted repaints them all.
- **A new head or part beside approved ones** is held to them row by row:
  `pxl compare art.px.js new_head_s approved_head_s` lists each row's extents and where the new one
  is wider. The harbor's crew kept their heads within a pixel of the traveler's skull this way.
- **A head for a figure in 3D** is modeled (the skull, the hair, a hat), baked once per view and its
  face painted over by hand, cut from approved hand faces (`views(name, field, { retouch })`,
  `pxl help "a body that turns"`). Ask to see each view's render and its retouch side by side; the
  traveler's, the crew's and the miko's heads were made so.

## 3D as code: which drawer, and edits by name

Something that turns, sways or is seen from several cameras is described once in meters and drawn as
pixel art (`pxl help "scenes 17"`, [`examples/sdf/`](../examples/sdf)). Which drawer:

| For | Use |
| --- | --- |
| solid forms (a trunk, a rock, a house, a crystal) | a distance field drawn by `surface()` |
| a block look, or a model for MagicaVoxel | `voxels()` (cells of any size; `ao` for creases) |
| faces you build by hand, an HD-2D diorama's ground | `mesh()` with `model()` (or `sdf.mesh` of a field) |
| air: mist, smoke, a cloud, a glowing orb | `volume()` of an `sdf.density` |
| leaves, moss, snow on a form | `sdf.scatter` (drawn as small brushes), not splats of the whole form |
| a face, a door, a rune, a sign on a form | a hand-drawn `decal()`, a drawing per view it needs |
| a captured or soft look to export | `splats()` and `.ply` (experimental) |
| a figure that turns and walks | `rig3d()`, its head baked per view by `views()` and retouched |
| a prop as a game's sprites, one per heading | `turnaround()` (the shrine's torii, hall and lanterns) |
| one thing in any of these ways | `draw3d(thing, { as: "voxels" })` |
| a thing in 3D standing in a `mesh()` diorama's sun and shadows | drawn after it (`light: "mesh"`, the default there; `graveyard_3d`) |

Whether a thing is worth drawing in 3D at all, and what a frame of each costs:
[By hand or in 3D](getting-started.md#by-hand-or-in-3d).

Ask for the scene as data: `world3d` parts made by builders (`make3d.tree`, `pine`, `bush`, `rock`,
`house`, `crystal`, `mist`, `smoke`) with parameters that mean something, placed by relations. A
request ("a denser canopy, wind from the left") is then a local edit of the parameters it names, and
the approved parts stay byte for byte as they were; in the [evaluation](evaluation-3d.md) a rewrite
kept them too but cost half again as much. Give the scene `expect3d` rules (the canopy above the
trunk, the rock clear of the house, one thing before another) and let `pxl check` run them; a rule
that fails over a place or a gap is fixed with no model by `pxl check --fix`. `pxl steps <file>
<scene> --at x,y` names the part that painted a pixel, to find a defect's cause. A part's place,
parameter, relation or drawer changes by `pxl edit` (`"target": "oak", "op": "set", "key":
"canopy", "value": 1.6`; `"op": "as", "as": "voxels"`), written into its spec. To turn a model round,
`export3d` it and open the viewer's "3D" link.

## What it costs

Measured on fresh agents given only the skill:

- The model study's 160×120 animated scene cost $0.54 on Opus at low (2 minutes) to $20.01 at max
  (68 minutes) in Claude Code; see [Pick the model and effort](#pick-the-model-and-effort).
- A 320×180 animated city street took one agent **85 turns and 31 minutes**. The same brief by a
  pipeline (a planner, eight forks drawing the parts and a ninth putting them together) came out
  denser but less coherent, for about **5× the tokens and 2× the time** (5.2× and 55 minutes).
- A frame takes 5 ms (a figure drawn in 3D) to 0.7 s (a diorama with a tree and a mist in 3D) to
  render ([the table](getting-started.md#by-hand-or-in-3d)): a story of hundreds of frames is
  checked one frame in N (`check: { every: N }`) and previewed with `--every 4`.

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

- **Read by section.** `SKILL.md` (about 3.5k tokens; a test keeps it under 14,000 characters) is
  loaded when the task matches. `pxl help "scenes 1 3 11 14"` is about 3k tokens where `scenes.md`
  whole is about 20k.
- **Edit, don't rewrite.** A file written whole again stays in the conversation.
- **Fewer turns.** One look per call, and all the fixes one look showed in one turn.
- **One big asset per conversation.** Start a new conversation for the next asset rather than
  carrying a long history.
- **The right effort.** Thinking is the biggest share, and effort sets it: medium for drafts and
  small fixes, xhigh for a scene you'll show.

## A big scene: one agent, a fresh one, or a pipeline

For a scene of 320×180 and up with many props and motion, the skill has the agent ask you which way
to make it, with the numbers above and how long the conversation already is. One agent is the
default: the cheapest and the most coherent (85 turns and 31 minutes for the city street).

When the conversation is already long (a few hundred thousand tokens), give the scene to a fresh
agent instead of going on: every turn re-reads the whole conversation. Write the brief to a file
(what to make, the stages to show, the files and guide sections to read, where the art goes) and
start a new session with it, `claude -p --effort xhigh --allowedTools "Bash Read Write Edit Glob Grep" < brief.txt`
or an interactive one told to read the file. Inside Claude Code, a subagent that isn't a fork starts
fresh too, with only its prompt. The harbor was made this way: a brief file, a fresh agent, the
stages approved one by one.

A pipeline has a planner write the palette (keys and ramps only), a plan (for each part: its file,
its assets named with the part as prefix, its box, pivot, where it is stamped, its light, one timing
for every loop) and the scene file that includes the parts. One fork of the planner draws each part
in its own file with a `test_<part>` scene, all at once, and a last fork puts the scene together.
Included files share one scope, so every top-level name in a part starts with the part's name.
[`examples/cyberpunk/pipeline/`](../examples/cyberpunk/pipeline) has a plan whose parts fit
(`plan.md`), the parts and the scene.

Run it from a new session. A fork carries everything in the session that makes it and rereads it on
every step: the 5× above was measured with the planner new (about 130k tokens of context when it
forked). Forked from a conversation of 500k tokens, each of the nine forks carries all of it, enough
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
- **Key frames of a long scene.** `pxl shot art.px.js scene --frames 0,40,80,120,160,200` lays them in
  rows when they are too wide for one: a contact sheet of the story. Moving:
  `pxl shot art.px.js scene --gif --every 4 --out <scratch dir>` builds one frame in four and prints
  the GIF's size.
- **See the guides.** `pxl shot art.px.js name --ref` draws the asset's `ref: true` layers over it
  (guide rows, a skeleton), to see whether the figure keeps to them.
- **Compare versions.** When the agent replaces art you approved, ask it to keep the old one as
  `<name>_old` and show both: `pxl shot art.px.js name name_old`. Against the last commit:
  `pxl shot art.px.js name --vs HEAD --diff` (the old version above, the changed pixels in red).
  Several moving at once: `pxl shot art.px.js walk_s walk_w walk_n --gif`.
- **Ask what painted a pixel.** `pxl steps art.px.js name --at x,y` names the source line.
- **Facing.** For a rig, `pxl blind` shows its parts unnamed to a reader who doesn't know which way
  they're meant to face, and checks the answers.

Watch the loops yourself: in the model study, an agent judging stills ranked two Codex scenes first,
and the curator, watching the loops, put every Codex scene below Claude's. Give notes the way you
would to an artist: what reads wrong and why ("the knight floats: the feet aren't on the ground
line"), one round with all of them.

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

Iterate on the cheap tests, run the full suite once before a commit. While you work, run only the
test file for what you changed, or the quick suite:

```sh
node --test test/docs.test.ts                            # one file: the commands and flags the docs cite
npm run test:quick                                       # every test but the two slowest, 9 to 16 s (45 after a change to pxl's sources)
PXL_EXAMPLES=hd2d node --test test/examples.test.ts      # the examples check, on one folder (or hd2d/harbor, or a,b)
npm run check                                            # types and every test, 13 to 20 s (2 min after an engine change): before the commit
```

The two slowest tests are the check of every example (70 to 120 s on a 4-core laptop when all 69
run, in one thread per four of the machine's, the slowest of the last run first) and the study of
the gallery's GIFs (7 to 27 s); a change to a check, to `study` or to an example is what they
catch. Both leave alone what already passed. Each example that passed is noted in
`node_modules/.cache/pxl/` with a hash of what its check read (pxl's sources, Node's version, the
test, the example and every file it read: what it includes, its palettes, PNGs and poses), and the
next run checks only the examples whose hash changed: an example edited reruns alone (half a
second for a small one, a few for the harbor), a shared file (`lib/profiles/hd2d.px.js`) reruns the
examples that include it, a change to pxl's sources reruns them all; the test says how many it left alone. The gallery's study is skipped
while pxl's sources and its two GIFs are the same. Every other test file but two is skipped the
same way, each while pxl's sources, the file, `test/helpers.ts` and what else it names (a fixture,
an example it includes, `types/pxl.d.ts`) are as they were when all its tests last passed: painting
or writing docs changes none of them, so the suite then runs only `docs.test.ts` and `node.test.ts`,
which read more than they could list (the guides and every file they link to; `pxl help` over the
examples, git, the scripts). A new test file starts with
`const test = whenChanged("test/<file>.test.ts", [what else it reads])` (`test/passed.ts`), naming
any example, doc or fixture it reads; one that can't say what it reads keeps node:test's `test`.
Delete `examples-passed.json`, `gallery-passed.txt` or a `<file>-passed.txt` there to run them
anyway.

The suite runs three test files at a time, below normal priority, as `pxl` itself does: on a 4-core
laptop seven at a time took as long, burned a fifth more processor and froze the user's programs.
`npm test` preloads `test/compile-cache.ts` (Node's compile cache, half a second off every test
file's start); a file alone runs the same with
`node --import ./test/compile-cache.ts --test test/<file>.test.ts`. The preload also puts the
temporary folders the tests make in one of each process's, removed when it exits (before, the tests
that didn't remove theirs had left 24,000 in the system's temp folder). With `PXL_EXAMPLES`, the
examples test checks only the examples whose path under `examples/` starts with it, says in its name
how many it left out, and leaves the other examples' lines alone.

`test/examples.checks.txt` holds what `pxl check` says on every example. After a change you meant
that adds or removes a warning, rewrite it and read the diff:

```sh
PXL_UPDATE=1 node --test test/examples.test.ts                       # every example
PXL_UPDATE=1 PXL_EXAMPLES=hd2d node --test test/examples.test.ts     # only those lines
```

An example that has grown slow slows every run of the suite: `node scripts/perf.ts <file>` times its
check, and `pxl build <file> --profile` names the art file's own slow functions (the harbor's water
worked out the same cells for every frame; once a pixel took its check from 28 s to 10 s). A long
story whose frames no rule reads (no `world.light`, nothing with a height or a front marker) can be
checked one frame in N, `check: { every: N }`: the frames checked only prove they build.

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

### The gallery

`docs/gallery/` holds the README's pictures, made by `node scripts/gallery.ts [name ...]`. Git keeps
every version of every file for good, and a GIF hardly compresses: each one committed and then
replaced stays in every full clone (one scene's five versions in a day added 24 MB). Look at a GIF
that isn't done with `node scripts/gallery.ts <name> --out <scratch dir>` (`--every 4` builds one
frame in four, a quick look at a long story; `pxl shot <file> <scene> --gif --every 4 --out <scratch dir>`
does the same for any scene and prints its size), and commit it once, at the end of the round. Keep
a GIF under 10 MB (GitHub stops animating bigger ones): a long scene at half its HD size (`graveyard_md`),
an excerpt of its story (`harbor_clip`), or `every` in the script's list.

### Keeping pxl fast

Agents run `pxl shot`, `check` and `study` many times a session, and the test suite runs `check` on
every example: a slow path costs every turn. Before and after a change to the engine:

```sh
npm run check                                           # types and tests: an engine change rechecks every example, about 2 min
node scripts/hashes.ts --vs HEAD                        # every example's assets built by the last commit's pxl and by yours: what differs
node scripts/hashes.ts --vs HEAD --frames 12 examples/hd2d/graveyard.px.js   # the animated ones' frames too, 12 over each loop (--frames: all)
node scripts/perf.ts                                    # pxl check's time, processor time and peak memory on every example
node scripts/perf.ts --vs HEAD examples/hd2d/traveler.px.js --only "^tr_walk_"   # ms a frame, the last commit's pxl against yours
node --import ./scripts/meter.ts --import ./test/compile-cache.ts --test --test-concurrency=3 "test/**/*.test.ts" 2>&1 | grep METER | sort -k2 -rn
node --cpu-prof --cpu-prof-dir=prof bin/pxl.js study clip.gif --no-out
node scripts/cpuprofile.ts prof                         # where that time went, by function
node scripts/served.ts examples/hd2d/graveyard.px.js graveyard_hd   # what the live viewer sends and holds for one asset (--vs HEAD too)
node scripts/pulse.ts walk.px.js walk walk_hybrid       # how many of a walk's normals turn on the parts that only moved
```

`--vs <rev>` unpacks the revision's `src/` and `examples/` once into the system's temp folder
(`pxl-rev-<commit>`, by `scripts/vs.ts`) and loads both pxls in one process: no worktree, no
stash. `hashes.ts --vs` prints only the lines that differ and a count, and exits 1 when one does: a
change meant to move no pixel ends with `0 differ`, frame by frame for the animated files
(`--only <regex>` narrows a file to some assets; a long scene's frames take a second each). `perf.ts --vs` builds each frame with one
pxl and then the other, alternating, because a laptop's speed drifts within seconds: two runs a
minute apart differ by more than most changes, and the same pxl against itself reads within 6% on a
figure. `meter.ts`, preloaded, prints each test file's time, processor time and peak memory: which
files hold the suite back (the three `study` files, 6 to 9 s each when they run; `node.test.ts`,
which runs every time, 6 s, part of it waiting on the processes it starts).

`served.ts` starts the live viewer's server on a file and fetches what the page would when an asset
is picked: run it after a change to the viewer or to what a build traces (a scene's frames all sent
with it held 2.65 GB on the HD graveyard's page and froze the browser; as PNGs on demand, 1.6 MB and
then half a megabyte a frame). `pulse.ts` follows an animation's normals from frame to frame over the
pixels that only moved: a `bump` made a frame at a time turns 6% of the traveler's walk, his 3D
model's own normals 1% ([lighting.md](../lighting.md)).

`pxl build --profile` names the slow functions of one art file's build. Keep a new test to what it
checks: a few frames, a small picture (a 3D one: a 30 px sprite, cells of 0.25 m), `study --seconds`
for part of a long clip.

3D marches a ray to each pixel through a field's distance, written as code (`sdf.ts`'s `Code`); a
change to the march (where a ray starts, a box that lets it skip) moves pixels, so speed comes from
that code: a join's children go in runs of 250 lines a function (V8 doesn't optimize one of thousands:
graveyard_3d's tree of 105 rods took 8 µs a point, 1.5 in runs), a long union tests each group of 8
children's box before the children (a big tree 1.5× as fast), and a material is one more pass noting
which child each join took. On the i5-1035G1 (2026-10): a figure's frame 5-6 ms warm (the warden 22;
a third of a body's time is its cloth's sweeps and their art functions), graveyard_3d 0.7 s a frame
(1.2 before the runs).

### Measuring sessions and models

```sh
# where one Claude Code session's tokens went, from its transcript (several files add up: a pipeline)
node scripts/tokens.ts ~/.claude/projects/<folder>/<session id>.jsonl
# one run of a model study: the brief to a new headless session in a folder of its own
scripts/model-study.sh <brief.txt> <runs folder> <model> <effort> [claude|codex|agy]
# what a run's edit of a scene changed, by id, and the pixels outside what the request names
node scripts/evaledit.ts <before.px.js> <after.px.js> <scene> --touch <ids>
```

`tokens.ts` splits the cost by what it paid for (thinking, tool results, the fixed context), then
lists each kind of tool result by how much of the context it took and how often later turns re-read
it. `model-study.sh` keeps each run's result, the pxl commit it read, and its start and end times.
[Doing it again](model-study.md#doing-it-again) has the whole study's commands. `evaledit.ts` scores
a run of the [edit experiment](evaluation-edit.md#doing-it-again), which has its commands too.
