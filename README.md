# pxl

**Pixel art as code.** Write a compact `.px.js` file; get PNGs, sprite sheets with JSON, animated
GIFs, and a live browser viewer that replays the painting step by step as you save.

Built for AI agents (it ships as a ready-made [agent skill](#use-it-with-an-ai-agent)) and pleasant
for people too. No runtime dependencies, no build step: just Node ≥ 22.18.

<p>
  <img src="docs/gallery/no_magic_night.gif" width="100%" alt="Animated witch's cottage at night: bubbling cauldron, fireplace, cat and frog">
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

Every image above is generated from a file in [`examples/`](examples).

## Showcase: a tropical forest

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

## Quick start

```sh
git clone https://github.com/crsolver/claude-pxl.git
cd claude-pxl
node bin/pxl.js serve examples/shop.px.js     # live viewer at http://127.0.0.1:4321/
```

Or run it without cloning:

```sh
npx github:crsolver/claude-pxl build art.px.js
```

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

## The live viewer

`pxl serve art.px.js` opens a viewer that rebuilds on every save and replays the asset you edited
op by op, so you (or whoever is watching an agent work) can see the art being painted. It also
writes the same `out/` files as `build`.

## Commands

```
pxl build <art.px.js> [--out DIR] [--only a,b] [--scale N] [--no-preview] [--aseprite]
pxl serve <art.px.js> [--port 4321] [--out DIR | --no-out] [--no-preview]
pxl ascii <art.px.js> <name>     print an asset as palette keys with x/y rulers
pxl list  <art.px.js>            list assets, groups and sheets with source locations
```

`pxl` means `node bin/pxl.js` in a clone, or `npx github:crsolver/claude-pxl`. Art files can be `.js` or
`.ts` (`types/pxl.d.ts` gives editor completion).

## What's in the DSL

- **Palettes and ramps**: one-character color keys, built-in palettes (pico8, sweetie16, endesga32…),
  dark→light ramps that drive `shade()` / `light()`.
- **Sprites**: text grids, mirroring, auto-outline, palette-swap variants, flips/rotations, reusable
  `_parts`, `stamp`.
- **Primitives and brushes**: rects, lines, circles, polygons, gradients, dithering, noise, a built-in
  pixel font, `scatter` brushes, tilemaps, random groups with reproducible seeds.
- **Scenes**: layers, cast-shadow and light layers, per-layer PNG export.
- **Animation**: frames as patches over a base sprite → strips + JSON tags + GIF.
- **Lighting** (optional): lamps, glow, normal-based relief (see [`lighting.md`](lighting.md)).
- **Errors** point at `file:line:col` and the asset/layer/op path, with "did you mean…" hints.

Full API: [`reference.md`](reference.md). Agent workflow and essentials: [`SKILL.md`](SKILL.md).

## Use it with an AI agent

This repository is an agent skill: `SKILL.md` teaches the workflow (write → build → look at the
preview → patch), `reference.md` holds the full API, and `lighting.md` is loaded only when needed.

**Claude Code**: clone it into your skills folder, then ask Claude to draw something.

```sh
# all projects
git clone https://github.com/crsolver/claude-pxl.git ~/.claude/skills/pxl-pixel-art
# or just one project
git clone https://github.com/crsolver/claude-pxl.git .claude/skills/pxl-pixel-art
```

**Other agents** (Codex, Cursor, …): point them at `SKILL.md` and tell them the CLI is
`node <path to pxl>/bin/pxl.js`.

Tip: ask the agent to start `pxl serve` so you can watch it paint in your browser.

## Development

```sh
npm install        # dev only: typescript, @types/node
npm run check      # type check + tests
node scripts/gallery.ts   # regenerate docs/gallery
```

```
src/core/     engine, no Node APIs: image, palette + ramps, canvas ops, build, trace, project
src/node/     vm sandbox loader, PNG/GIF encoders, outputs, CLI, live server
src/viewer/   browser viewer (served type-stripped; no bundler)
types/        pxl.d.ts globals for editor support in .px.ts files
scripts/      build.js (dist/ for npm installs), gallery.ts
examples/     example art files
test/         node:test suites
```

In a clone the CLI runs the TypeScript sources directly. When installed as a package it runs
`dist/`, which `npm install` / `npm pack` generate via `scripts/build.js` (Node won't strip types
inside `node_modules`).

## License

[MIT](LICENSE)
