# pxl

**Pixel art as code.** You write a short `.px.js` file. pxl turns it into PNGs, sprite sheets with
JSON, animated GIFs, Tiled maps and Aseprite files, and a live browser viewer replays the painting
step by step each time you save.

pxl was made for AI agents to draw with: an agent looks at its own art in one call and fixes it. It
works by hand too. Three ways to use it:

- **As a Claude Code skill.** The repository is the skill: clone it (or link a clone) into
  `~/.claude/skills/pxl-pixel-art`, then ask Claude to draw something.
  [Use it with an AI agent](#use-it-with-an-ai-agent) has the details.
- **As a CLI.** `node bin/pxl.js build art.px.js` in a clone. You need Node 22.18 or newer, and
  nothing else: no install, no build step, no runtime dependencies.
- **With a live preview.** `node bin/pxl.js serve art.px.js` opens a viewer at
  http://127.0.0.1:4321/ that rebuilds on every save and replays the painting op by op, to draw by
  hand or to watch an agent work.

> This is a fork of [crsolver/claude-pxl](https://github.com/crsolver/claude-pxl).
> **[Fork differences](docs/fork-differences.md)**: what it adds, in one page.

<p>
  <img src="docs/gallery/no_magic_night.gif" width="100%" alt="Animated witch's cottage at night: bubbling cauldron, fireplace, cat and frog">
</p>
<p>
  <img src="docs/gallery/sunset_cliff.gif" width="49%" alt="Animated sunset on a sea cliff: an adventurer watches the sun go down beside a glowing tent and a campfire">
  <img src="docs/gallery/tournament.gif" width="49%" alt="Animated tournament: two armored knights fight on foot in a sand arena before a cheering grandstand">
</p>
<p>
  <img src="docs/gallery/comet_repair.png" width="49%" alt="Comet Repair shop scene">
  <img src="docs/gallery/gull_and_gill.png" width="49%" alt="Gull &amp; Gill bait shop scene">
  <img src="docs/gallery/moon_buns_3d.png" width="49%" alt="Moon Buns bakery scene">
  <img src="docs/gallery/neon_noodle_3d.png" width="49%" alt="Neon noodle bar scene">
</p>
<p>
  <img src="docs/gallery/cave.gif" width="49%" alt="Animated glowing cave">
  <img src="docs/gallery/cat.gif" height="96" alt="Animated cat">
  <img src="docs/gallery/frog.gif" height="96" alt="Animated frog">
  <img src="docs/gallery/clock.gif" height="128" alt="Animated clock">
</p>

Every image above is generated from a file in [`examples/`](examples). The long projects are under
[Showcases](#showcases).

## Contents

- [Install](#install)
- [A first file](#a-first-file)
- [Use it with an AI agent](#use-it-with-an-ai-agent)
- [Commands](#commands)
- [What's in the DSL](#whats-in-the-dsl)
- [Documentation](#documentation): [Getting started](docs/getting-started.md) (by hand),
  [Working with an agent](docs/agents.md), [the reference](reference.md)
- [Showcases](#showcases)
- [Development](#development)

## Install

```sh
git clone --depth 1 https://github.com/augusto-scarvalho/claude-pxl.git
cd claude-pxl
node bin/pxl.js serve examples/shop.px.js     # live viewer at http://127.0.0.1:4321/
```

`--depth 1` takes the files as they are now, not every past version of the gallery's GIFs (the whole
history is several times the size); `git pull` still updates it.

Or run it without cloning:

```sh
npx github:augusto-scarvalho/claude-pxl build art.px.js
```

Below, `pxl` means `node bin/pxl.js` in a clone, or `npx github:augusto-scarvalho/claude-pxl`.
Reading JPEG, WebP or video (only `pxl study`, `pxl shot` and `pxl compare` do) needs `ffmpeg` on your PATH.

## A first file

Write `art.px.js`:

```js
pal({ k: "#1b1630", g: "#8ccf63", G: "#4c8a44", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })

// Write the left half; mirror it and outline it automatically.
sprite("slime", { mx: true, outline: "k" }, `
  ....ggg
  ..ggGGg
  .ggGwGg
  gggkwgg
  GGGGGGG`)
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R" } })   // a recolor in one line

sheet("chars", ["slime*"], { pad: 1 })
```

```sh
node bin/pxl.js build art.px.js
```

```
out/sprites/slime.png  out/sprites/slime_red.png      the art, at 1x
out/chars.png          out/chars.json                 sprite sheet + TexturePacker-style JSON
out/_preview/*.png                                    upscaled previews with a pixel grid
```

`pxl serve art.px.js` opens a viewer that rebuilds on every save and replays the asset you edited op
by op, so you (or whoever is watching an agent work) can see the art being painted. It writes the
same `out/` files as `build`. Art files can also be `.ts`: `types/pxl.d.ts` gives editor completion.

[Getting started](docs/getting-started.md) goes on from here: an animation, a scene, what a build
writes, which command to use when, and learning from a reference.

## Use it with an AI agent

This repository is an agent skill. `SKILL.md` teaches the agent the workflow: write the file, look
with `pxl shot` (and read a scene as text with `pxl describe`), fix everything one look showed in one
turn, `pxl check`, `pxl build`. The agent reads the reference and the guides a section at a time
through `pxl help`, so it pays only for what the task needs.

For Claude Code, clone pxl into your skills folder, then ask Claude to draw something:

```sh
git clone --depth 1 https://github.com/augusto-scarvalho/claude-pxl.git ~/.claude/skills/pxl-pixel-art
```

`git pull` there updates it. If you already have a clone, make `~/.claude/skills/pxl-pixel-art` a
link to it instead. To be sure the skill is used, name it: "use the pxl skill to draw ...".

The Codex CLI, Antigravity's `agy` and other agents install it differently: see
[Install the skill](docs/agents.md#install-the-skill). [Working with an agent](docs/agents.md) also
covers which model and effort to pick (in the [model study](docs/model-study.md), Opus at xhigh was
the sweet spot), writing a brief, how the agent works and what a session costs, one agent or a
pipeline for a big scene, and reviewing the result.

## Commands

```
pxl build <art.px.js>             PNGs, sheets + JSON, GIFs and previews in out/ (--only a,b, --share N, --aseprite)
pxl serve <art.px.js>             the live viewer: rebuilds on save and replays the painting
pxl shot <art.px.js> <name>       one asset as a picture to look at: frames side by side, a region enlarged,
                                  values only (--grey), guide layers over it (--ref), the last commit above
                                  and the pixels that changed (--vs HEAD --diff); more names a row each, or
                                  playing side by side in one GIF (--gif); a reference GIF, WebP or video too
pxl ascii <art.px.js> <name>      an asset as palette keys with x/y rulers
pxl describe <art.px.js> <name>   a whole scene as text: what is where, what covers it, how it moves
pxl check <art.px.js>             warnings on every scene and frame; LOOK lines on hand-drawn lines
pxl steps <art.px.js> <name>      how it was painted; --at x,y names the line that painted that pixel
pxl list <art.px.js>              a map of the file: each definition's lines and comment
pxl compare <art.px.js> <name> <ref.png | other>   silhouette rows against a reference or another asset
pxl blind <art.px.js> <name...>   facing labels checked by a reader who doesn't know them
pxl study <picture or clip>       learn from finished art or a reference, and what to use in pxl for each part
pxl help [name]                   the reference on an op or option, or a guide's section
```

`pxl` alone prints every command with all its options. [Which command, when](docs/getting-started.md#which-command-when)
says which to reach for.

## What's in the DSL

- **Palettes and ramps**: one-character color keys, built-in palettes (pico8, sweetie16, endesga32…),
  Lospec files, dark→light ramps that drive `shade()` / `light()`, `shades()` for a hue-shifted ramp
  from one color.
- **Sprites**: text grids, mirroring, auto-outline (plain, selective, inside, with dark `caps` where a
  line steps), palette-swap variants, flips and rotations by any angle, reusable `_parts`, `stamp`,
  anti-aliasing as by hand (`aa`).
- **Primitives and brushes**: rects, lines and curves drawn pixel-perfect, circles, polygons,
  gradients (dithered, or by whole rows: `grad(..., "lines")`), dithering, noise, pixel fonts (a 3×5
  built in, a 5×7 to include, `mono` for a score), `scatter` brushes, tilemaps, random groups with
  reproducible seeds.
- **Scenes**: layers, cast-shadow and light layers, per-layer PNG export.
- **Animation**: frames as patches over a base sprite → strips + JSON tags + GIF; motion blur
  (`stamp(..., { smear })`); parts half a pixel along (`stamp(..., { sub: true })`) for an idle
  without the single-pixel bob. A scene runs on the clock of what it stamps, or on its own:
  `scene(..., { frames, fps })`.
- **Characters**: `rig()` skeleton first (slots, stand-ins, parts ordered by facing, turned with
  `twin` parts), `ik` for poses, `register` by the pelvis (see [`characters.md`](characters.md)).
- **Lighting** (optional): lamps, glow, normal-based relief (see [`lighting.md`](lighting.md)).
- **In meters**: a camera with one, two or three vanishing points (`perspective()`), ground
  (`plane()`), hills (`terrain()`), things built of solid shapes and their shadows (`solids()`,
  `shadows()`), faces you are inside of (`mesh()`), and after a `mesh()` a camera's depth of field,
  haze and bloom (`post()`, the HD-2D look); see [`scenes.md`](scenes.md).
- **Going by in a loop**: parallax planes (`scroll()`, across or, with `axis: "y"`, down the
  picture; pxl warns when a plane would judder), `clouds()`, smoke and steam (`plume()`, and
  `smoke()` in shapes: a column on a path, a puff, a bank, a ring).
- **Effects, as shaders do them, on the CPU**: `effect()` on a sprite, an anim's frame or a layer, on
  the clock: a dissolve in patterns and looks (burn with flames, acid, frost, magic, neutral),
  pixelate, dither to the palette, tint, a UV distortion, a plant swaying in the wind, an aura, energy,
  emission that lights `mesh()`; on one placement with `fx`. Abilities on the clock: `ability()`
  phases, `emitter()` particles, `trail()`; a spell kit, `spell("fire", 3, { from, to })`: nine
  elements at three tiers (fire, fira, firaga), each a recipe to start one's own from, with variants
  (an iceberg, a falling boulder, a quake, a meteor, a wave...) and views (side, top-down, isometric,
  a perspective camera);
  `post()`'s finish (Three's bloom, a `.cube` LUT, grain, sharpen, the picture back in the palette).
- **Out**: sprite sheets with JSON tags (`rows: "tag"`: an animation a row; the sheet's preview GIF
  plays them all), GIFs, Tiled maps (`.tmj`), Aseprite files to keep editing.
- **Errors** point at `file:line:col` and the asset/layer/op path, with "did you mean…" hints.

## Documentation

| For | Read |
| --- | --- |
| a first sprite, an animation and a scene by hand; which command when | [docs/getting-started.md](docs/getting-started.md) |
| running an agent: install, model and effort, briefs, how it works, costs, review; tests for contributors | [docs/agents.md](docs/agents.md) |
| which model and effort to draw with: one scene, seventeen runs | [docs/model-study.md](docs/model-study.md) |
| every op and option | [reference.md](reference.md), or `pxl help <name>` |
| the agent's workflow, and which example teaches what | [SKILL.md](SKILL.md) |
| scenes, perspective, HD-2D dioramas, parallax, shadows | [scenes.md](scenes.md) |
| grass, trees, bushes, rocks, walls and paths as games draw them | [environment.md](environment.md) |
| characters, animation with parts, rigs | [characters.md](characters.md) |
| lamps, walls that block light, normal maps | [lighting.md](lighting.md) |
| turning a sprite by any angle, 8 or 16 directions | [rotation.md](rotation.md) |
| what this fork adds to the original | [docs/fork-differences.md](docs/fork-differences.md) |
| what is still open | [BACKLOG.md](BACKLOG.md) |

## Showcases

Long projects made with pxl by agents, most over rounds of a curator's notes. Each is a folder in
[`examples/`](examples) to read and copy. Smaller files to start from (the starter
`basics.px.js`, tilesets, a top-down game character with idle, walk, run and a sword attack in four
directions in [`examples/topdown_hero/`](examples/topdown_hero), an HD-2D figure in eight directions
and a small diorama in [`examples/hd2d/`](examples/hd2d), a kit of grass, trees and rocks in
[`examples/nature/`](examples/nature)) are in the [examples table](SKILL.md#examples) of `SKILL.md`.

### A tropical forest

<p>
  <img src="docs/gallery/tropical_forest.gif" width="100%" alt="Animated tropical forest seen from above at an angle: a waterfall churning its pool, a river under a plank bridge, a dirt trail, palms and big trees, a jaguar on a branch, a monkey swinging, a macaw, butterflies and a girl breathing on the trail">
</p>

The first long project made with pxl, by an agent working with a curator over many rounds of
feedback: a 320×240 animated jungle in [`examples/tropical/`](examples/tropical). A waterfall
churns its pool and sends foam down a river that winds under a plank bridge. A dirt trail is laid
with a terrain tileset. Big trees, palms and the understory throw shadows laid flat on the ground,
and grass and weeds cover the whole floor. In the trees, a jaguar lies on a branch and a monkey
swings; a macaw, a frog and butterflies are around, and an Indigenous girl breathes on the trail.
What the agent kept getting wrong on the way became pxl features (`cast` shadows, `relight`,
`tilemap` corners) and notes in [`SKILL.md`](SKILL.md) and [`characters.md`](characters.md).

The trees, palms and big leaves are reduced from "[LPC] Jungle" by bluecarrot16, Lanea Zimmerman
(Sharm), Sevarihk, Hyptosis and others, and from Sevarihk's "Animated Palm Tree Sprite", both
CC-BY 4.0: they keep that license, so credit their authors when you reuse them (full list in
[`examples/tropical/refs/CREDITS.md`](examples/tropical/refs/CREDITS.md)). Everything else in the
scene, the trail's tileset included, is drawn in code and MIT like the rest of the repository.

### A Halloween party in the cemetery

<p>
  <img src="docs/gallery/halloween_party.gif" width="100%" alt="Animated Halloween party at night in a cemetery: a full moon behind a dead tree, a crypt with its door glowing and a werewolf howling on its roof, string lights and a mirror ball, a Frankenstein DJ at a coffin booth between coffin speakers, a witch stirring a cauldron, and a skeleton, a vampire, a mummy, a zombie and a ghost dancing among graves and jack-o'-lanterns">
</p>

The second long project, in [`examples/halloween/`](examples/halloween): a 320×180 night scene lit
only by `lighting()`, with a cold moonlit ambient and lamps on everything that glows (jack-o'-lanterns
flickering out of step, string lights, the crypt's door, a witch's cauldron, a mirror ball over the
dance floor). Eight monsters loop on one 2-second cycle: a skeleton whose bones are drawn between
joints, a vampire whose cape opens like bat wings, a mummy doing the Egyptian, a zombie doing
Thriller, a ghost, a witch stirring, a Frankenstein DJ and a werewolf howling at the moon. Figures
near the strongest lights throw their silhouettes away from them (`cast` from a point light). Making
it led to `pxl describe` (a whole scene as text an agent reads at once: where each object shows, its
gaps, what covers it, how it stands out after lighting, how it moves; `--diff` after an edit) and
to a GIF encoder that keeps small figures' colors in lit scenes. Everything is drawn in code, MIT.

### Journey's end on a sea cliff

<p>
  <img src="docs/gallery/sunset_cliff.gif" width="100%" alt="Animated sunset on a sea cliff: an adventurer seen from behind, cloak streaming in the wind, watches the sun go down over the sea while the camp goes up behind them: a ridge tent glowing where the low sun comes through the canvas, its loose corner flapping, a campfire, a pack, a sleeping bag laid out at the door, a cairn with a pennant; clouds drift, a skein of birds crosses toward the sun">
</p>

The third, in [`examples/sunset/`](examples/sunset): a 320×180 backlit scene. A fresh agent made
the first version from the skill alone; a curator's notes then went into the tent, the sleeping bag
and the sky. With the sun low ahead, everything facing us is in shadow, edges toward the sun glow,
and shadows run long toward us, each one laid away from the sun's point on the horizon. The tent's
canvas glows where the light comes through it, darker wherever the cloth doubles (seams, patches,
the ridge tape), and its unpegged corner lifts in the wind. The sky loops in 19.2 s while
everything else repeats every 1.2 s. Its clouds drift a whole pixel at even intervals, slower near
the horizon. Scrolling a wrapping strip would make the loop as long as the strip's width over the
speed, so each cloud instead thins away once a loop and re-forms where it started, out of step with
the others. A skein of birds crosses toward the sun, and a faint aura breathes around it. Everything
is drawn in code, MIT.

### Knights built skeleton first, at a tournament

<p>
  <img src="docs/gallery/tournament.gif" width="100%" alt="Animated tournament in pixel art: two trumpeters sound a fanfare, the marshal, an old herald with a white beard, drops his white baton, and two armored knights, blue and red, fight on foot in a sand arena: two exchanges mirror to mirror with sparks where the blades meet, a slash from above taken on the shield each way, a last clash that throws both back in a cloud of dust, a salute, and the walk back to their marks; behind them a palisade, a grandstand under a striped canopy with a cheering crowd and heraldic banners, two trumpeters, striped pavilions with pennants and a castle on a hill">
</p>

The fourth, in [`examples/rig/`](examples/rig): a 72 px knight built the way
[`characters.md`](characters.md) §11 describes. A `rig()` lays out its slots first (joints, boxes,
the body's sides) and shows a stand-in for each part not drawn yet; each part is then drawn on its
own from plates, each lit on its own layer, and drops in. The rig orders the parts from the way the
knight faces, so the near arm is in front and the far one behind; `turn` makes the same knight
facing left, relit for the same light, and the red knight is that one recolored. The shield is a
part with two faces: facing right we see its inside (straps, grip), facing left its cross; it
hangs from the hand and lies along the forearm. Assets say which way they face and how tall they
really are, the scene says where its horizon, eye and light are, and `pxl describe` checks every
placement against them: which way it faces, whether it's a mirror image, its size where it
stands, whether its feet are on the ground, which side it's lit from. Then they fight: each pose
is a rig of its own, its sword arm, sword and legs drawn from the pose's joints (two-bone IK, the
feet flat on the ground), and a 96-frame list of poses is the bout, with the sparks, the dust, the
marshal's signal and the fanfare on the same clock.

### A cyberpunk street at dusk, made two ways

<p>
  <img src="docs/gallery/sodium_hour.gif" width="100%" alt="Animated pixel-art cyberpunk street at dusk in dusty yellow haze, made by one agent: a sun-bleached megacity of brutalist blocks and glass towers behind an elevated freeway with its own traffic, a taco stand, a liquor store, a parking lot with fan palms, a clinic under a cyberware billboard, a red hotel with a fire escape and neon signs, power lines and a wooden pole, cars along four lanes and people walking the sidewalk">
</p>
<p>
  <img src="docs/gallery/cyberpunk_city.gif" width="100%" alt="The same brief made by a pipeline of agents: a denser cyberpunk street at dusk, teal shade and sodium lamps, apartment blocks and shops with neon signs (FIX, TACO, OPEN, WASH, DOC), a billboard, a teal hologram bust, an elevated freeway, palms and power lines, cars and a bus in the street and a crowd walking the near sidewalk">
</p>

The fifth, in [`examples/cyberpunk/`](examples/cyberpunk): one brief, a 320×180 street at dusk in
the spirit of Cyberpunk 2077's Night City (sun-bleached megablocks, dusty yellow haze, freeways,
holo-ads, traffic and people; original art, no real logos), made twice from the skill alone. On
top, one agent: 85 turns in 31 minutes, a 36 s loop. Below, a pipeline: a planner wrote the
palette, a plan with every part's box, light and timing, and the scene file; eight forks of it drew
the sky, towers, freeway, shops, signs, street, traffic and crowd at once, each in its own file;
a last fork put them together. The pipeline came out denser, with more people, cars and shops, but
less coherent, and cost about five times the tokens and twice the time: worth offering for a big
scene, not a default. Its plan is there to read (`pipeline/plan.md`).

### An HD-2D graveyard: a visit, in eight directions

<p>
  <img src="docs/gallery/hd2d_graveyard.gif" width="100%" alt="Animated HD-2D diorama in pixel art: a graveyard on a grassy hill in a pine wood, morning mist, seen from high up through a long lens; a rounded hill held up by a mossy stone wall, stone steps up its front, a flagstone path between headstones, a wooden picket fence following the hill's edge, a dead tree, boulders at the corners, pines and the dead tree swaying in the wind as dead leaves blow across; a young traveler in a green cloak comes in through the wood, climbs the steps, kneels by an old grave and lays a red rose at its foot, crosses to a grey-haired mourner and asks in a parchment dialogue box if she is all right; she turns to him and answers, and he walks back down and away; the near and far edges soft with depth of field">
</p>

The sixth, in [`examples/hd2d/`](examples/hd2d): the look of Octopath Traveler's dioramas. The
ground is built in meters with `mesh()` (textured boxes laid a texel to a pixel, a hill with a
rounded, uneven outline, a fence drawn in blocks of the sprites' pixel) and the people, stones and
trees stand in it as sprites, shadows cast by one sun, then `post()` adds the camera's depth of
field. The pines and the dead tree are volumes in 3D, rendered to pixel art and swaying in the
wind. The traveler is a 34 px figure built on a skeleton in 3D inside pxl with a head drawn by hand
per view; his 42 s visit walks each of his eight directions once, at his walk's own pace, his feet
on the ground, the steps and the path, kneels to lay a rose (another pose of the same skeleton), and
talks in dialogue boxes as Triangle Strategy draws them, their prompt blinking for a button.
[`characters.md`](characters.md) §3 keeps what the user's notes on each try of him taught (a big
head, stick limbs, a hunch, a cloak fixed in the world).

### An HD-2D harbor: a galleon, its crew, a passage aboard

<p>
  <img src="docs/gallery/hd2d_harbor.gif" width="100%" alt="Animated HD-2D diorama in pixel art: a harbor on a bright afternoon, seen from high up through a long lens; a galleon moored along a wooden pier, its pale planked hull with a red band of gold ornaments, white balusters, red and white lanterns at the stern, three masts with rope ladders and sails sewn of canvas panels glowing in the sun from behind, bobbing gently; the pier on two levels with a diagonal ramp, a wooden crane with a swinging crate, crates, barrels and sacks, rowboats moored in front, gulls crossing, blue water full of sun glints blurring into bokeh, a striped awning soft in the foreground; dockhands and sailors at work, each with their own hair and clothes; a young traveler in a green cloak walks up beside a grey-haired captain in a long navy coat and asks in a parchment dialogue box if this is the ship to Port Winds; the captain turns to him and answers, and the traveler walks up the gangplank aboard">
</p>

The seventh, in [`examples/hd2d/`](examples/hd2d): a port after a screenshot of Octopath Traveler
II, its camera matched by measuring the picture (22 degrees down through a 30-degree lens, the frame
20 figures wide). The galleon, the pier on its two levels and the boats are built in meters and drawn
in blocks of the sprites' pixel, their wood laid a texel to a pixel: planks of their own tones,
grain, knots, tar, worn where feet go. The sails are cloth sewn of panels, each piece toned by the sun
through it; the water glints, the far glints blur into bokeh, and the hull shows in it between the
ripples. The crew ([`crew.px.js`](examples/hd2d/crew.px.js)) are dressed on the traveler's skeleton,
each with a head of their own drawn per view and an outfit swept round the body. In the 38 s loop
Alden comes along the upper walkway, down the ramp, asks the captain in parchment dialogue boxes and
goes aboard; the GIF is its middle, at the full frame rate.

### An HD-2D clearing: a fireball, a wall, a scarecrow on fire

<p>
  <img src="docs/gallery/hd2d_clearing.gif" width="100%" alt="Animated HD-2D diorama in pixel art: a clearing in a pine wood at dusk, seen from high up through a long lens, long shadows across the grass; pines, a dead tree, bushes and tufts of grass swaying in one wind, out of step; a young traveler in a green cloak on a flagstone path draws his hand back as fire gathers at it, an aura of fire flickering round him, and throws a fireball that lights the ground as it flies; it passes behind a ruined stone wall, which hides it, and hits a straw scarecrow, which catches fire at the chest, the flames spreading over it and lighting the grass and the wall, a column of smoke rising, until it burns away to embers and ash; then the scarecrow comes back and the loop closes">
</p>

The eighth, in [`examples/hd2d/clearing.px.js`](examples/hd2d/clearing.px.js): every shader of the
fork in one scene, on its 5 s clock, the same in every frame you seek. The wood and the grass sway in
one wind (`effect("sway")`), a gust rolling across, no two tufts in step. The traveler's cast is a
new pose of his skeleton, blocks first, his hand a socket that moves with it; the fire gathers there
(`effect("energy")`), an aura hugs every frame of the pose (`effect("aura")`, blended `add` in
`mesh()`), and the ball flies on an `ability()`'s clock, lighting the ground as it goes, hidden by the
wall it passes behind. It hits; the scarecrow catches fire where it was hit and burns away (the
dissolve's `"burn"` look on that copy alone: flames from its burning front, the char and the embers
behind them, ash), its shadow burning with it, a column of `smoke()` rising, sparks from an
`emitter()`. Through `post()`: the depth in focus, Three's bloom, a dusk grade from a `.cube` LUT and a
grain that stays still (one that changed each frame made the GIF 13 MB instead of 2.5).

### A spell kit: elements, tiers, variants, views

<p>
  <img src="docs/gallery/spells_ice_earth.gif" width="100%" alt="Animated sheet in pixel art of ten spells at their strongest tier, each in a small dusk scene where a young traveler in a green cloak gathers energy at his hand and casts at a standing stone: above, ice: spikes bursting from the ground, an iceberg of flat faceted ice rising out of the ground, cracking and shattering into shards, a block of glacier falling with a slow turn onto the stone and breaking, a blizzard of shards driven slantwise, a ring of frost running out along the ground with crystals springing up; below, earth: rock spikes, a tall stone spire thrusting up and crumbling, a mossy boulder falling, cracking the ground and breaking up, a quake whose fissures run out while rocks thrust up along them, a slide of rocks coming down one after another">
</p>

The ninth, in [`examples/spells.px.js`](examples/spells.px.js) and
[`examples/spell_variants.px.js`](examples/spell_variants.px.js): a whole cast in one call,
`spell("ice", 3, { from: "hero.hand", to, variant: "iceberg" })`, drawn by `cast()` on the clock and
leaving from the caster's hand. Nine elements (fire, ice, lightning, water, earth, wind, light, dark,
heal), each a recipe to start one's own from; three tiers the Final Fantasy way (fire, fira, firaga:
size, particles, time, light, bloom and the drama of the hit); variants with a form (an iceberg, a
falling boulder, a quake, a meteor, a wave, a chain of lightning...), their big solids drawn by the
volume method, lit, cracking and breaking up; and views: the same spell from the side, from above, in
isometric or through a perspective camera.

### True perspective

<p>
  <img src="docs/gallery/road.gif" width="100%" alt="Animated pixel-art road across the Brazilian sertão at sunset in one-point perspective: cracked asphalt with dashes and edge lines running to the horizon, mandacaru and xique-xique cacti, leafless catingueira shrubs, juazeiro trees, boulders and dry grass, a crooked barbed-wire fence, power poles and a windmill, a chapada on the horizon and the sun going down into a pass with vultures circling; a backlit walker in a leather hat with a pack and bedroll walks away down the road, getting smaller step by step until they dissolve into the light, their long shadow walking with them">
</p>
<p>
  <img src="docs/gallery/park.gif" width="100%" alt="Animated pixel-art park at two in the afternoon in two-point perspective: two paths crossing in the middle, hedges, benches and lamp posts running to two vanishing points, pastel apartment blocks beyond with their windows doing the same; a playground with swings, a slide, a climbing frame and a seesaw, a yellow ipê in bloom, an ice-cream cart under a striped umbrella; two children playing tag come out from behind a hedge, turn at the crossing and run off behind the cart, a woman in a straw hat walks her caramel dog away up the other path until a hedge hides them, a girl swings, pigeons peck by a chalk hopscotch">
</p>
<p>
  <img src="docs/gallery/extinction.gif" width="100%" alt="Animated pixel-art end of the Cretaceous in three-point perspective, seen from low down looking up: a huge volcano erupting, a fountain of lava from its crater and rivers of lava down its gullies, its ash column bent over by the wind; a soot-dark sky with the four o'clock sun breaking through, the glow of the big meteor's strike behind the mountain and smaller meteors still falling; burning araucarias whose trunks lean in toward a vanishing point above the picture; a tyrannosaur and a herd of gallimimus running left in front of a burning fire front, pterosaurs fleeing overhead, embers and ash blowing on the wind">
</p>

[`examples/perspective/road.px.js`](examples/perspective/road.px.js): the sertão at sunset, everything
laid out in meters and projected by `perspective()`, so every cactus, stake and boulder is the size it
should be where it stands; the ground drawn by `plane()` pixel by pixel from where each pixel looks.
Each thing is built once as parts (trunks, arms, twigs, crowns), and the same parts draw it and cast
its long shadow, so a mandacaru's shadow has its arms and the walker's walks with them. The walker
holds their size for a whole step and shrinks only when the next foot lands; under 15 px they switch
to sprites drawn by hand for each size (14, 12, 10 ... 5 px), picked by `stamp`'s `fit`.
Below, [`park.px.js`](examples/perspective/park.px.js): the camera turned 40° (`yaw`), two vanishing points,
at two in the afternoon. Benches, hedges, trees and lamp posts are shapes in meters (`solid.box`,
`stick`, `blob`, `cone`): `solids()` draws them far to near and `shadows()` sweeps the same shapes
onto the ground from the one sun. People and the dog are bodies in meters posed by a gait computed in 3D, so
they're right from any angle the paths give them and cast their own short shadows; the children run
behind the ice-cream cart because everything is drawn far to near, and the loop closes because both
paths end behind a hedge.
Then [`extinction.px.js`](examples/perspective/extinction.px.js): the camera tilted up 18° (`pitch`), three
vanishing points: the horizon set low (row 150 of 180) and the burning araucarias lean in toward a third
point high above the picture (`vertical()`). The volcano is `terrain()`, a heightfield ray-marched
through the same camera; its lava rivers run down the steepest way; the dinosaurs are profiles in
meters on a run worked out in 3D, their legs painted round by `capsule()`, each covering more than
the picture's width in the loop so their coming back is never seen. Trees, logs and scrub burn with
`flame()`, every fire leaning with the one wind.

### Parallax

<p>
  <img src="docs/gallery/parallax_train.gif" width="100%" alt="Animated pixel-art steam train crossing the hills of Minas Gerais on a misty morning, seen from beside the line: a black maria-fumaça after the Oeste de Minas engines, with a tall stack, two domes and a bell, red wheels and polished rods, a gray-haired driver at the cab window and a fireman feeding the firebox, a tender of firewood with a big white 41, and a varnished wooden coach with people leaning on the window sills, a child waving, a conductor on the platform; its smoke streams back over the coach. Behind it the land runs past at six speeds: a blue stone ridge on the horizon barely moving, hills with araucárias and mist in the valleys, pasture in patches of drier and greener grass with cattle trails along the slopes, woods in the folds, coffee rows, cows and a white farmhouse, then telegraph poles, a bamboo clump, banana plants and an ipê-roxo in bloom along the embankment, and the grass in front a blur of blades and flowers.">
</p>

[`examples/parallax/train.px.js`](examples/parallax/train.px.js): the camera rides along with the train,
so the train stands still and the land runs past behind it. Each plane is a strip drawn once with
`wrap: "x"` and placed every frame further along: in the 12 s loop of 192 frames the hills go by
384 px, the pasture 768, the trackside 1536 and the grass in front 1920, each strip round a whole
number of times and a whole number of px every frame, so no plane judders. The ridge on the horizon,
too slow to go round, drifts 32 px in the loop while its outline crossfades into itself. The drivers
turn a whole number of times a loop with the rods on their crank pins, and every puff of smoke is
left behind at the speed of the ground, so the last frame runs into the first.

<p>
  <img src="docs/gallery/race_cockpit.gif" width="100%" alt="Animated street race at sunset on a coastal highway, seen from the driver's seat of a nineties sports coupe: the road bending to its vanishing point, the sea and the setting sun on the left, mountain ranges paling with distance, Atlantic forest, palms and lamp posts on the right; three rival cars overtaken one after another, drawn in perspective as they draw level; the 3D-modelled dash, gauges and mirrors, gloved hands on a turning wheel, the right hand dropping to change gear before a burst of speed">
</p>

[`examples/perspective/race.px.js`](examples/perspective/race.px.js): a street race from the driver's
seat. The road is `plane()` through a camera at 1 m that bends with it (`bend`). The rivals are drawn
by hand from behind at seven sizes, the camera picking the nearest (`fit`), and drawn whole in
perspective as they draw level, their long shadows thrown by `shadows()` from the low sun; the serra
is three ranges paling with distance, each rising out of the sea at a headland. The cockpit, after a
Supra A80's, and its steering wheel are modelled in 3D in meters and drawn through the same camera by
`mesh()` ([`cockpit.px.js`](examples/perspective/cockpit.px.js)): each face toned by how it lies to
the sun, outlined where it ends in front of another. Each mirror is another camera looking back. Our
speed is a profile in time whose integral moves everything, so the loop still closes; before the burst
the right hand leaves the wheel to change gear. Each hand is a puppet of joints read off photographs
of a hand gripping, set on the rim every frame, its fingers painted round by `capsule`; the sleeves
are shaded as crumpled cloth.

## Development

```sh
npm install                                          # dev only: typescript, @types/node
node --test test/docs.test.ts                        # one test file, while you iterate
PXL_EXAMPLES=hd2d node --test test/examples.test.ts  # the examples' check on one folder
npm run test:quick                                   # every test but the two slowest (~20 s)
npm run check                                        # type check + every test (~60 s), once before a commit
```

```
src/core/     engine, no Node APIs: image, palette + ramps, canvas ops, build, trace, project, study
src/node/     vm sandbox loader, PNG/GIF encoders, outputs, CLI, live server
src/viewer/   browser viewer (served type-stripped; no bundler)
types/        pxl.d.ts globals for editor support in .px.ts files
scripts/      the maintainers' scripts, below
examples/     example art files
test/         node:test suites
```

| Script | What it does |
| --- | --- |
| `scripts/build.js` | writes `dist/` for npm installs |
| `scripts/gallery.ts` | regenerates `docs/gallery/` from the examples (`--out DIR` to look first, `--every N` for a quick look) |
| `scripts/calibrate.ts` | scores `pxl study` against the examples' own source |
| `scripts/perf.ts` | `pxl check`'s time and peak memory on every example |
| `scripts/hashes.ts` | a hash of every asset of the files given, to diff before and after an engine change that shouldn't move a pixel |
| `scripts/cpuprofile.ts` | a CPU profile of any pxl command, summed by function |
| `scripts/tokens.ts` | where a Claude Code session's tokens went, read from its transcript |
| `scripts/model-study.sh` | one run of the [model study](docs/model-study.md): a brief to a new Claude Code, Codex or `agy` session |
| `scripts/mhtml.ts` | saved web pages (`.mhtml`) opened as text and images, to read tutorials |

How to use them, and how to update the examples' snapshot after a change you meant, is in
[Working with an agent](docs/agents.md#for-contributors).

In a clone the CLI runs the TypeScript sources directly. When installed as a package it runs
`dist/`, which `npm install` / `npm pack` generate via `scripts/build.js` (Node won't strip types
inside `node_modules`).

## License

[MIT](LICENSE)
