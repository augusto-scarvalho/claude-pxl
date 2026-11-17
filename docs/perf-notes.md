# Performance notes

The measurements behind pxl's speed: what each mechanism gained, on which machine, and the paths tried and dropped.
What each mechanism is and the rules a contributor keeps are in [Keeping pxl fast](agents.md#keeping-pxl-fast); what
a user sees and sets is in [the reference](../reference.md#kept-builds-threads-and-workers).

## Contents

- [The machines and the files](#the-machines-and-the-files)
- [Comparing versions and timing them](#comparing-versions-and-timing-them)
- [Builds kept on disk](#builds-kept-on-disk)
- [Traces kept](#traces-kept)
- [Pure functions](#pure-functions)
- [The march on more threads](#the-march-on-more-threads)
- [Whole builds on worker threads](#whole-builds-on-worker-threads)
- [The 3D march's code](#the-3d-marchs-code)
- [The march on the GPU, tried and left](#the-march-on-the-gpu-tried-and-left)
- [The live viewer and the normals](#the-live-viewer-and-the-normals)
- [Writing the files](#writing-the-files)

## The machines and the files

- **The i5-1035G1**: a 4-core laptop, 8 threads. With four threads busy its clock falls from 2.2 to 1.6 GHz, and it
  heats.
- **The i7-13700K**: a desktop, 16 cores, 24 threads.
- **Haldor** and **Reva** are the fighting game's two fighters
  ([`haldor_fighter.px.js`](../lib/characters/haldor_fighter.px.js),
  [`reva_fighter.px.js`](../lib/characters/reva_fighter.px.js)), each drawn in 3D; **the round** is their bout
  ([`examples/fighting/round.px.js`](../examples/fighting/round.px.js)), which carries Haldor's frames in a memo of
  its own.

A time is one command's, on one thread unless it says otherwise. Cold: nothing kept yet; warm, or after an edit: most
traces read back from the store. Most readings say their month and how they were taken.

## Comparing versions and timing them

- `hashes.ts` with no files takes every example and `lib/` file, as the examples test lists them (132; the examples
  alone were 75): an art change costs 10 s of loading to skip what it doesn't reach, an engine change builds all of
  them on both sides (about 32 min on a 4-core laptop: 22 the examples, 10 `lib/`).
- `hashes.ts --cache` on two fighters' idle and walk, the store off, then on, then on again: 10 s, 8.5 s writing,
  1.3 s read back, the same lines each time.
- Why `perf.ts --vs` alternates: a laptop's speed drifts within seconds. Two runs a minute apart differ by more than
  most changes, and the same pxl against itself reads within 6% on a figure.
- `meter.ts` on the suite: the three `study` files take 6 to 9 s each when they run; `node.test.ts`, which runs every
  time, 6 s, part of it waiting on the processes it starts.

## Builds kept on disk

- Haldor's `check` went from 137 s to 4 the second time (his 217 traced frames), the round's from 142 to 8, the round's
  frame 100 shot from 131 to 4. An edit to a file the project loaded, or to `src/`, makes its builds again (the round's
  edit, Haldor's frames in it too), what their traces march read back where their fields are pure.
- A scene's frame is not kept: it is composed again in 40 ms of the builds kept.
- A build quicker than the digest of the art's state isn't kept, as reading it back would cost one: a file holding
  90 ms of tables keeps only builds slower than that.

## Traces kept

- What is kept at each hit, and why. Each ray's hit is kept (8 bytes). A hit spares the march, two thirds of Haldor's
  cold frame; with the march kept, the normal's four taps were 34% of his check after an edit and the pass that finds
  each join's choice (it works the distance out once more to learn it) 19% (Reva's 27% and 13%), so the normal
  (24 bytes, the numbers the light and the paint are given, which don't compress) and the choices (a byte a join) are
  kept too, and only the paint's own functions, the light and the lines run again.
- Haldor's check after an edit to a comment went from 95 s to 49 (2026-11, the hits kept), and with the normals and
  choices kept too from 76 s to 37 (one thread, the last commit's pxl against the new one the same hour). The five
  fighting files' traces take 76.6 MiB on disk (18.5 with the hits alone; the store's budget is 512).
- The paint kept. With the march, the normals and the choices kept, the paint functions were about 14 s of his 37 s
  check after an edit (Reva's 4.4 of 16), so where a field's every paint function is pure what it gives at each hit
  (a material and a part, 2 bytes) is kept beside the trace. With it, on the i5-1035G1 (2026-11, one thread, the last
  commit's pxl against the new one alternating): Haldor's check after an edit to a comment or to one move went from
  21 to 22 s to 14 to 16; after an edit to one paint function from 20 to 22 s to 19 to 21 (that field is painted again
  in every frame).

## Pure functions

- A pure function asked once a pixel runs in a realm of its own, entered from pxl's at each pixel, and there V8 runs
  destructuring, spread, `for...of` and an array's methods taking a function several times slower (a destructured
  `[a, b] = q` 8×, `.some` 3×, measured on the i5-1035G1), and its helpers, being its data, are called, not inlined.
  Haldor's idle and jab (14 frames, every store off) took 6.0 s painted by closures and 6.7 to 7.7 s by pure functions
  so written; with the hot ones indexed and `fighter.capD` (under `shadowed`, asked dozens of times a pixel) and a
  bone's paint worked out on numbers, the same operations in the same order, 5.1 to 5.2 s against 5.1 (the same
  pixels, `hashes.ts`).
- Making them. `pure()` copies a function's data into its scope, hardens it and hashes it: 20 to 40 µs on the
  i5-1035G1 for one among a dozen helpers. A figure's `parts(j, p)` makes its sixty or so again every frame, and the
  fighters' is asked twice a frame (the body's rig and the near arm's): about 29,000 `pure()` calls in Reva's check,
  which cost more than reading her paint back saved (half her draws paint under the store's 10 ms floor, so they are
  painted at every build whatever is kept), and the checks of their data ran once for every way a draw reached them.
  So `pure()` asked again with the same source and data gives back the function it made (8 to 12 µs; 64 a source
  kept), and a trace's checks run each pure function's once a pass. Her check now makes about 7,200 and gives back
  21,800.
- A check after an edit, one thread, alternating runs: before the paint was kept, then the paint kept with every pure
  function made anew, then with them given back.

| | before the paint was kept | every function made anew | given back |
| --- | --- | --- | --- |
| i5-1035G1 (2026-11, two or three runs each, the laptop an hour into them): Reva | 10.6 to 12.9 s | 9.4 to 14.4 | 11.8 to 12.1 |
| Haldor | 24.8 to 32.1 s | 14.1 to 19.9 | 18.2 to 19.2 |
| the round | 35.9 to 37.0 s | 32.8 to 33.3 | 30.7 to 32.4 |
| i7-13700K (four runs each): Reva | 4.2 to 5.9 s | 5.0 to 5.3 | 4.4 to 7.0 |
| Reva, the medians | 4.7 | 5.1 | 4.8 |
| Reva, CPU time | 6.3 s | 7.0 | 7.0 |
| Haldor | 11.9 to 13.2 s | 6.5 to 7.7 | 6.1 to 7.3 |
| the round | 17.5 to 18.5 s | 15.8 to 17.7 | 15.3 to 17.3 |

Reva's CPU time on the i7 says some of keeping the paint's cost is still paid there. A first check, nothing kept yet,
is the same within either machine's noise: on the i7, Reva's 13.3 to 13.9 s / 13.4 to 16.2 / 13.1 to 14.0, Haldor's
57 to 61 s / 56 to 58 / 53 to 59.

## The march on more threads

- On the i5-1035G1 (2026-11) two threads marched Haldor 1.5× as fast for a few seconds and 1.1× over his whole check
  (the march 64% of it; with 3 and 4 threads no faster, the paint slower as the laptop heats): the check 1.06× at best,
  so it settles on 1 and times nothing more.
- On the i7-13700K (16 cores) the guess is 6, from its first command: his check 63 s forced to 1, 46 s on 4 threads and 45 s on the 6 (1.4× as fast).
  Measured before the guess, 8 threads were no faster than 4 and 16 slower; the ladder that found 4 took eight
  commands, which a machine whose guess is 3 or more no longer pays.
- On the i5 made to guess as 12 threads, the march on the guess's 3 made the round's check 94 to 101 s against 80 to 87
  on one: a file's first command, and one whose workers were measured down to 1, march on one thread too.

## Whole builds on worker threads

The march's threads spread only the march, 64% of Haldor's frame, and wait on the rest; a worker makes whole builds.

- On the i7-13700K (2026-11, `--no-cache`, the march on one thread in each) Haldor's check took 63 s on one thread, 47
  with the march's 4 threads, 18 with 4 workers, 16 with 6, 17 with 8 and 26 with 16; the round's 54 to 62 s, 32 to
  39 with 4 workers and slower from 8: its bout reads one move's frames at a time, and its own thread still makes about
  900 of its builds (the scene's frames, each move's first frame).
- On the i5-1035G1 two or three workers made Haldor's check 1.3× as fast and the round not at all: four busy threads
  run each about 2.5× as slow there (the clock falls from 2.2 to 1.6 GHz, threads share cores). So how many is
  measured per command and file, not per machine.

How the number is found, and the readings that set each rule. A file's first command runs on one thread and notes
each build's ms there (a file with under 10 s to share starts none; a command that found every build made leaves the
note as it was), and its own thread's time apart from them (the load, the scene frames, the checks, the files written:
the same whoever makes those builds). Where the first guess is 3 or more (12 threads: 3; the i7-13700K's 24: 6) the
next command takes it, and every command on more than one weighs that own time and its builds handed out at those ms
against what it took, the heat in it, at no cost. It is judged only against a command on one thread made the same way,
cold or warm (a build counted by its own): after an edit Haldor's check took 20 s on one thread against 74 cold (warm,
about a quarter of the time), so the cold ms read his 3 workers, 1.15× as fast there, as 4×, and Reva's, 0.92×, as
2.3×. With none such, the next command runs on one thread to note it. Each command with builds to share is a row in
the file's log, its last 16 kept in `pxl-threads.json` (when, how many workers, cold or warm, its builds at one thread's
ms, its own thread's time, what it took, when its workers were cut), and the number is read off the rows, on the safe
side rather than the fastest (the user's rule: no campaign of trials on their machine): halved for that command and
file (3 to 1) when its last two commands judged at that number both read under 1.15× as fast, so one command slowed by
something else on the machine changes nothing; after 8 commands on a lowered number one runs on the number above, kept
there from 1.15×, else back, the next try after twice as many commands (16, 32, 64 at most). A file that stays on
workers keeps the one-thread measure it had (not renewed: no command runs on one thread for it); one on one thread
renews it at each command. A command still slower than one thread by a fifth 30 s after its workers began, even with
its own thread's time taken as slowed as theirs, stops them and makes the rest itself: its workers, not the number.

A machine where two commands judged on its full guess read 2× as fast or more (any files) is trusted: from then on no
command runs on one thread to learn, a file's first command takes the guess, and only what is known already is judged,
until its last three judged on the full guess all read under 1.15×.

- The i5 (4 cores) guessing as 12 read 0.96× to 1.46× (its fastest check, Haldor's cold one when the laptop ran slow: 136 s on
  one thread, 93 on 3).
- The i7-13700K (24 threads), `--no-cache`, read Haldor's check 64 s on one thread then 16 to 17 s on 6 (4.05×), the round's 52 then
  31 to 32 (1.68×), Reva's 12.9 then 3.2 to 3.8 (3.71×), every run's text the same. So a new user there pays a file's
  first command on one thread until two commands have read 2× (Haldor's check used three times: once), and a weak
  machine keeps the whole correction.
- On the i5-1035G1 made to guess as a 12-thread machine does (a preload setting `os.availableParallelism` and
  threads.ts's `record.file`; the tests pass `top`), `--no-cache`, each file's first command and its second: Haldor's
  check 82 s then 63 on 3 workers (1.31×; on 2, 65 to 66 s), his build 108 then 88 (1.23×); Reva's check 21 then 22
  (0.96×), her build 40 then 34 (1.18×); the round's check 77 then 75 (1.03×), its build 159 then 160, its workers
  stopped 126 s in (1.00×): the readings under 1.15× halve their file's number at the second. Every file written and
  line printed was one thread's.
- Tried and dropped: two estimates that would have spared that first command on one thread read far from whole
  commands on one thread. Builds timed alone for a second or two at the start: the workers' first builds, cold and
  made while the others load, run far slower than their later ones (Reva's check read as 0.80× where it gained 1.09×,
  Haldor's was cut 30 s in where it gained 1.28×). The command's own thread taken as slowed as the workers' builds: it
  encodes and writes, which slows less (Haldor's check within 6%, but Reva's build read as 0.93× where it gained
  1.18×).
- A 4-core laptop, whose guess is 2, takes turns on 1 and 2 until each has a minute of work: it settled on 2 for one
  fighter's check and on 1 for the round's.

## The 3D march's code

- A join's children in runs of 250 lines a function (V8 doesn't optimize one of thousands): graveyard_3d's tree of 105
  rods took 8 µs a point, 1.5 in runs. A long union testing each group of 8 children's box before the children: a big
  tree 1.5× as fast.
- On the i5-1035G1 (2026-10): a figure's frame 5-6 ms warm (the warden 22; a third of a body's time is its cloth's
  sweeps and their art functions), graveyard_3d 0.7 s a frame (1.2 before the runs).
- A field the art asks its `dist()` while it is traced: Haldor's bib, a shell round his torso, asks the torso at each
  point; asking `out.torso`, not the same parts joined again, his cold check went from 89 s to 76 (2026-11).

## The march on the GPU, tried and left

Built whole as an opt-in mode and not merged (2026-11): on the i5-1035G1 laptop it gains no more than the worker
threads do, and its pixels are not the CPU's. The laptop has two GPUs, an NVIDIA MX350 (2 GB) and an Intel UHD, both
reached by D3D12 through Dawn's Node bindings (the `webgpu` package, pinned at 0.6.2, its native binary checked by
hash before it loaded; Node itself has no GPU interface).

- **What was built.** A translator from a field's compiled distance to WGSL, the art's `pure()` functions included:
  their restricted JavaScript read by a small parser and run symbolically over their data, so frames of one shape
  give one shader with other numbers. It is exact: the text read back as JavaScript in f64 is pxl's distance bit for
  bit (28,000 points of seven fields: Haldor's body and arm, Reva's body, two examples). And an executor behind the
  seam the march's threads use: a trace of 4,096 cells or more goes to the GPU and comes back as each ray's hit and
  normal; the joins' choices, the paint and the files stay on the CPU.
- **A trace is fast.** A body's trace of Haldor (15,000 rays, with the normal): 184 ms on one CPU thread, 20 to 25 ms
  on either GPU.
- **A shader is slow to make.** A body's pipeline the first time: 10 s on the MX350, 35 s on the UHD (by DXC; FXC
  took 310 s); 2.4 to 3.6 s once the driver has seen it, which each process pays again: the bindings keep no compiled
  shader between processes. Skipping the compiler's optimizations and the bounds checks: 1.4 to 1.7 s seen, the same
  new. Haldor's body is 15 shaders, one a pose's shape (a clip plane or a turn folded away); laid onto each other
  with neutral numbers they are 3 when all are known, 6 or 7 as a build meets them. Reva's stay 13: her poses differ
  by the parts present. One shader for every field, a register machine running a field's code as data: 9 to 13×
  slower than the generated one, as slow as the CPU.
- **Haldor's cold build, one worker**: 105 to 110 s with the GPU off; on the MX350 88 s with its shaders seen and 99 s
  new; on the UHD 92 s and 97 s. Reva's: 38.5 s off, 47.4 s on the MX350. Of Haldor's 226 big traces 43 to 74 stayed
  on the CPU, marched there while their shader compiled (nothing waits for one) or in the command's first 10 s (a
  rule a `shot` of one frame needed: Dawn finding the adapters and a compile under it made it 6.0 s against 4.2).
- **With three workers**, as the laptop builds him: 91 and 112 s off, 122 and 143 s on (four builds, alternating; the
  laptop heating over them).
- **Why so little.** The march is under half the build's time (the files are a quarter of it, the GIF 17 s); a
  new shader's compile takes about 16 s of other cores, which on four cores slows the command's own thread; and
  three workers already make this build 1.23× as fast, every pixel the same.
- **The pixels.** Against the GPU-off build: on the MX350 105 of Haldor's 273 frames differ, 814 of 1,360,230 painted
  pixels (0.060%), all but 3 a tone step inside a region, 43 in the worst frame; on the UHD 110 frames and 883
  pixels; Reva on the MX350 16 of 203 frames, 126 of 549,865 pixels. The two adapters differ from each other too
  (16% of their hits' distances in the last bits). So such builds were kept under keys of their own.
- **The native code.** The process aborted when a command ended while a compile was under way (three times before
  the exit was made to wait for it), and when Dawn's objects were collected.
- **What could change it**, unmeasured: a machine with many cores (a compile then takes nothing from the command) and
  a far faster card; one GPU thread marching for every worker; a shader a figure that loops over its parts as data;
  compiled shaders kept on disk, which Dawn has (Chrome uses it) and these bindings do not expose.

## The live viewer and the normals

- `served.ts` on the HD graveyard's page: a scene's frames all sent with it held 2.65 GB and froze the browser; as
  PNGs on demand, 1.6 MB and then half a megabyte a frame.
- `pulse.ts`: a `bump` made a frame at a time turns 6% of the traveler's walk, his 3D model's own normals 1%.

## Writing the files

A build's PNGs and GIFs were most of a cold build's time: on the i5-1035G1 (2026-11, `--no-cache`, one thread,
`PXL_WORKERS=1`), each file written timed by kind (the asset's PNG or strip, its GIF, the previews, the onion
sheet), split into a PNG's filtering and deflate and a GIF's palette, LZW and frame deltas. Seconds of encoding and
writing in a build, then the build's wall time, two cold runs each, the last commit's pxl and the new one alternating:

| build | encoding before | after | wall before | after |
| --- | --- | --- | --- | --- |
| `examples/spells.px.js` (221 files) | 25.5 s | 8.5 | 43.9, 41.2 s | 25.9, 23.0 |
| `examples/grotto.px.js` (106 files) | 7.2 s | 2.7 | 14.4, 14.0 s | 8.1, 9.1 |
| `examples/perspective/bend.px.js` (6 files, a strip of 160 frames of 320x180) | 13.0 s | 5.1 | 41.9, 43.1 s | 38.7, 35.1 |
| `examples/perspective/extinction.px.js` (6 files) | 1.6 s | 1.0 | 10.1, 8.5 s | 7.7, 7.7 |

Every file of the four builds decodes to the same pixels, frames and delays as before (PNGs to RGBA, GIFs to their
frames composited); the GIFs are the same bytes. What each change took, measured alone:

- **A preview GIF at 1x was the asset's GIF made again.** A scene's preview, and a long anim's (its frames side by
  side pass 2048 px, so 1x), with no clear pixel and no guide, has the asset's own frames: its GIF is now the
  asset's bytes written again. The spells' scene (352x768, 80 frames, 207,240 colors) took 8.7 s for the second
  copy; the grotto's 2.9 s, bend's 0.9.
- **The median cut asked every box its range and weight at every cut**: 255 cuts over all the colors. Each box's
  score is worked out once, when it is made, the same palette: the spells' scene 3.8 to 5.6 s to 1.5 to 1.9, the
  grotto's 2.6 to 4.7 s to 1.1 to 1.7 (one process, the same frames, alternating). What is left is the k-means'
  four passes of the nearest entry over every color.
- **Deflate at level 7, not 9.** The PNGs of the four builds deflated at each level, the seconds and the bytes:

  | build | level 9 | 8 | 7 | 6 |
  | --- | --- | --- | --- | --- |
  | spells | 6.07 s, 4.30 MB | 2.75 s, 4.32 | 1.55 s, 4.62 | 1.44 s, 4.68 |
  | grotto | 0.85 s, 6.39 MB | 0.62 s, 6.39 | 0.46 s, 6.43 | 0.44 s, 6.47 |
  | bend | 11.54 s, 6.24 MB | 7.57 s, 6.33 | 2.84 s, 6.66 | 1.92 s, 6.85 |
  | extinction | 1.01 s, 0.60 MB | 0.55 s, 0.60 | 0.23 s, 0.62 | 0.16 s, 0.63 |

  Level 6 made bend's strip 10% larger. At 7 the builds' files are 0.5% (grotto) to 4% (bend) larger in all; 61 small
  files grow by more than 10% (each under 42 KB before, 174 KB together, most of it the spells' normal maps, 2.5 KB
  each).
- **A pixel the same as the one before it asks no map**: the PNG's palette index, the GIF's color count and its entry
  for each pixel, taken once a run (the colors met in the same order). About 1.1 s of the spells' encoding, 0.3 of
  the grotto's.
- Tried and dropped: the PNG filters Sub and Up on every row (bend's strip 3.2 to 3.3 MB against 2.1 with none, only
  the grotto's smaller); `Z_FILTERED` (larger, no quicker); `Z_RLE` (bend's strip 19.6 MB); a larger `memLevel` (the
  same); the nearest entry's sum left as soon as it is no nearer (as quick: 250 to 300 ms a pass over 207,240 colors
  either way). The encoders on worker threads: a GIF is one palette over every frame and a strip one image, so the
  costly ones are single calls; not built.
- Left: the spells' scene GIF, 3.6 s of the 8.5 (the median cut 1.6, most of it the k-means; each run's entry and the
  frame deltas 1.0; the colors counted in a map 0.6; LZW 0.5); bend's three PNGs 51,000 px wide (the strip, its
  preview and its onion sheet), 1.2 to 1.5 s each.

### A fighter's files

A fighter writes what those four builds don't: many anims of one figure (Haldor: 37 of 150x150, 273 frames), each
with its previews at a scale, and a sheet whose preview GIF plays them all at once, each in a cell of its own
(`playAll`), a frame every 20 ms (his frames of 1/60 s have no longer step in common) over his longest loop. That GIF
led: 144 frames of 1284x1344 at 1x, 248 million pixels, 35 times all his anims' own GIFs together, nine in ten of
them the checker behind clear pixels. Measured as above (2026-11, the i5-1035G1, `--no-cache`, `PXL_WORKERS=1`),
seconds of encoding and writing in Haldor's build, by kind:

| Haldor's files | before | after |
| --- | --- | --- |
| the sheet's GIF (1 file) | 18.4 s: the colors counted 8.1, indexes and deltas 4.4, LZW 2.4, `preview()` 3.4 | 7.1: 1.4, 3.6, 1.1, 1.0 |
| the previews: PNGs, GIFs, onion sheets (112) | 3.4 s | 2.2 |
| the strips, the anims' GIFs, the sheet and its maps (113) | 1.6 s | 1.5 |
| all 267 | 23.4 s | 10.8 |

Reva's build: 17.3 s to 7.0 (her sheet's GIF, 130 frames of 1064x1100, 13.1 to 3.8). The median cut never runs on a
fighter (20 and 22 colors). Haldor's wall time, cold pairs alternating, the last commit's pxl and the new one: 102.7 and
95.8 s, 104.1 and 95.9, then with the laptop hot 117.3 and 140.5, 143.6 and 109.1 (Reva's build took 52.7 s then, 39.0
before). The sheet's GIF is the last file a build writes, on the command's thread, every anim done: with the workers
the record set, from the sheet's PNG to its GIF took 20.5 s and now 10.1 (the builds 127.0 and 124.1 s, hot). Every
file of the two fighters and of the four builds above is the same bytes. What each change took, measured alone on
Haldor's sheet GIF's frames (one process, alternating, the median of three):

- **At 1x the checker changes at every pixel**, so "a pixel the same as the one before it asks no map" asked the map
  at nearly every pixel. The last two colors are held now: counted when a third comes, the older first (the same
  counts in the same order: the same palette, a median cut's too), 14.3 s to 9.3; a loop on indexes, not `for...of`
  over the pixels, 6.2 s to 5.4. An entry asked only for a color that is neither of the last two: 8.8 s to 7.5. The
  PNG's palette index the same way: the sheet's 1x preview PNG (1818x5982) 0.56 s to 0.39.
- **LZW's table in a typed array**, not a map, emptied of what it was given after each use: 8.1 s to 7.2.
- **`preview()` at 1x in one pass over the pixels** (10.9 million: 96 ms to 50), and at a scale each source pixel's
  color worked out once a row and a row the same as the one above it copied (4x 30 ms to 8, 8x 167 to 59). Its share
  of Haldor's build: 4.0 s to 1.2.
- Tried and dropped: the pixels read as an `Int32Array` in the count and the indexes, and the arrays held in locals in
  `preview()`'s loop (no gain past the laptop's noise). Not built: a preview GIF at a scale from the 1x frames'
  indexes (Haldor's 37 took 1.0 s before, 0.5 after); the sheet's GIF on a worker (the only work left by then, one
  palette over its every frame: splitting its frames among workers would send them 248 million pixels).
- Left: the sheet's GIF, 7.1 s of Haldor's 10.8 (the indexes and the deltas over its every pixel 3.6). `playAll`'s
  144 sheets and their 144 previews are held at once before the encoder takes them: 2 GB of pixels for Haldor's, by
  their sizes (not measured).

**The sheet's GIF from a fraction of the memory.** Measured then, a build whose frames are all read back from the store
(the peak by `process.resourceUsage().maxRSS`): Haldor's peaked at 3,317 to 3,412 MB writing that file, Reva's at 1,782
to 2,088. `playAll`'s sheets also carried the normals their frames brought (5.2 MB more a sheet of Haldor's). A tick
of that GIF draws again 8.6 of Haldor's 37 anims (11.7 of Reva's 35), and 2% of a frame's pixels really change. Now,
the same bytes:

- the encoder takes its frames on demand, from a function it calls twice (the colors, then the encoding), holding
  one: a copy of what it read, to find the frames the same as the one before. `playAll` makes them over one sheet,
  drawing an anim again only when it steps, without its normals (the sheet never shows them; drawn, they were most
  of the drawing's time);
- at 1x the checker goes in place (`checker()`), only where a frame changed: no second copy;
- each frame says where it changed (for each anim that stepped, the box of its frame before and this one: 13% of
  Haldor's frame a tick, 14% of Reva's), and the encoder indexes, compares and cuts only there, the rest being the
  frame before's;
- the colors: the first frame counted pixel by pixel, the others only where they changed, for a color not met yet.
  One such color at most keeps the palette's order (it comes last: Reva's white, from her sixth frame); two or more,
  or past 255 colors, and the frames are read once more, whole. A caller that says nothing (every other GIF) is read
  as before.

| | the build's peak, before | after | the build, before | after | the sheet's GIF alone, before | after |
| --- | --- | --- | --- | --- | --- | --- |
| Haldor | 3,317 to 3,412 MB | 1,130 to 1,314 | 19.4 to 22.4 s | 11.6 to 16.2 | 9.6 s, +2,480 MB | 2.5, +100 |
| Reva | 1,782 to 2,088 MB | 682 | 16.1 to 19.0 s | 10.3 | 5.5 s, +1,510 MB | 1.8, +100 |

The builds alternate the last commit's pxl and the new one, three of Haldor's each, one or two of Reva's (`pxl build`,
the workers as the record sets them). The GIF alone is `playAll`, `preview()` and the encoder in one process over the
frames read back, three pairs alternating (the median; CPU 11.8 s to 3.0 for Haldor's, 6.2 to 2.2 for Reva's), and
what its process held more. Each way measured alone, in that order, on Haldor's: the frames on demand took what the
GIF holds from 2.5 GB to 0.1 and no time (10.6 s to 10.9); the checker in place no time either; looking only at the
anims' cells that stepped, 5.8 s; the colors there too, 4.8; the frames drawn without their normals, 3.3 to 4.0; the
boxes of the frames, not their cells, 3.0 to 3.9 (single runs, the laptop warming). Every file of the two fighters'
builds and of the four builds above, a gallery GIF and a `shot --gif` are the same bytes. Left: LZW, about 1 s of
Haldor's 2.5, over the rectangle that changed (half the frame: two anims far apart make it wide); the frames made
twice, 0.4 s. An anim's or a scene's GIF gains nothing and loses nothing (bend's 160 frames of 320x180 encoded in 0.52
to 0.57 s before, 0.55 to 0.60 after; its build's peak 724 MB and 723): its frames are made all at once for its strip
and onion sheet anyway (37 MB for bend's), and they say nothing of where they changed.
