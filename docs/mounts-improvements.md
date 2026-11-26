# Mounts Iteration: Reference Tools, Diagnostics, Ergonomics & Encoder Optimizations

This document records the CLI tools, DSL diagnostics, ergonomics fixes, documentation cleanup, and measured encoder optimizations added to `pxl` after building the HD-2D 5-direction mounts and mounted riders library ([mounts.px.js](../lib/characters/mounts.px.js), [examples/hd2d/mounts.px.js](../examples/hd2d/mounts.px.js): 7 mount archetypes across 5 directions, mounted cavalry with rider sockets and reins, fall-to-down transitions, and horse/ox-drawn cargo wagons).

Every change below grew directly out of real scratchpad scripts, subtle bugs, missing diagnostics, or friction points hit during that workflow — and every performance change was validated with multi-run alternating benchmarks against `HEAD` rather than single runs.

---

## Summary Table

| # | Area | Change | Key Files | Motivation | Measured / Practical Impact |
|---|---|---|---|---|---|
| 1 | CLI / 3D | Native 3D model turnaround: `pxl shot <model.glb \| model.obj>` | [model3d.ts](../src/node/model3d.ts), [cli.ts](../src/node/cli.ts) | Studying external `.glb`/`.obj` anatomy references required ad-hoc scratch Python/Node rasterizers | Zero-dependency orthographic 5/8/4/1-dir turnarounds matching `pxl` pitch/headings + `W × D × H` proportion ratios; tested on multi-million-triangle textured `.glb`s |
| 2 | CLI / Debug | Socket crosshair overlay: `pxl shot --sockets` | [shot.ts](../src/node/shot.ts), [cli.ts](../src/node/cli.ts) | Verifying saddle `seat`, `bridle`, and hitch sockets across 5 directions and animations required custom overlay scripts | Compact 5×5 colored crosshairs + legend + out-of-frame warnings across stills, multi-row shots, groups/globs, `--vs`, and `--gif` |
| 3 | DSL / Diag | `anim` `(c, fi)` callback, `frames`/`ms` mismatch error, static-GIF warning | [build.ts](../src/core/build.ts), [project.ts](../src/core/project.ts), [gif.ts](../src/node/gif.ts), [output.ts](../src/node/output.ts), [cli.ts](../src/node/cli.ts) | Writing `(c, fi) => ...` silently left `fi === undefined` and produced static GIFs; mismatched `frames` + `ms` silently truncated | `(c, c.frame)` works seamlessly; `frames`/`ms` mismatches throw clearly; both `pxl build` and `pxl shot --gif` warn when all frames are identical |
| 4 | Diagnostics | Duplicate-hex `swap` / `slots` collision warnings | [build.ts](../src/core/build.ts), [canvas.ts](../src/core/canvas.ts), [project.ts](../src/core/project.ts) | Two palette keys with the same hex in one `swap` silently clobbered each other (because `recolor` maps by RGBA) | Immediately caught a live bug in [mounts.px.js](../lib/characters/mounts.px.js) where barding keys `ЮЯЁЄІ` overwrote rider plate armor `жзийк` |
| 5 | 3D / DSL | Standalone `rig3d.joints(body, pose, heading)` | [project.ts](../src/core/project.ts), [pxl.d.ts](../types/pxl.d.ts) | Computing world-space rider/rein joints without registering dummy assets forced re-implementing kinematics by hand | Direct access to `jointsOf()` on `rig3d`; unlocks pure kinematic queries for mounted riders and props |
| 6 | Profiler | Attribute compiled SDF samples in `pxl build --profile` | [profile.ts](../src/node/profile.ts) | V8's CPU profiler dropped anonymous `new Function()` SDF samples because `callFrame.url` was empty | Shows `(compiled sdf) src/core/sdf.ts (generated)` in `and in pxl:` with **0% runtime overhead** (no `//# sourceURL=` penalty) |
| 7 | Testing | `test/examples.test.ts` `PXL_UPDATE=1` clean exit & diff summary | [examples.test.ts](../test/examples.test.ts) | `PXL_UPDATE=1` rewrote the snapshot and still failed the test; mismatches didn't list differing filenames | `PXL_UPDATE=1` exits 0 with a summary of updated/removed files; mismatches list exact files and the update command |
| 8 | Library | Missing `;` and `_` glyphs in `font5x7` | [font5x7.px.js](../lib/ui/font5x7.px.js) | UI/label rendering dropped semicolons and underscores | Complete printable punctuation set with 0 visual diff on existing examples |
| 9 | Perf | Direct LZW sub-block encoder in `gif.ts` & two-step CRC in `png.ts` | [gif.ts](../src/node/gif.ts), [png.ts](../src/node/png.ts) | GIF LZW copied every frame twice (`number[]` → sub-blocks); PNG copied the entire IDAT payload for CRC32 | 5-round alternating medians (100% byte-identical): GIF **1.07×–1.22×** faster; PNG RGBA **1.06×** faster |
| 10 | Docs | `SKILL.md` optimization & `reference.md` / `pxl.d.ts` sync | [SKILL.md](../SKILL.md), [reference.md](../reference.md), [pxl.d.ts](../types/pxl.d.ts) | `SKILL.md` sat at 13,991 / 14,000 chars and lacked the newest workflow flags and helpers | Trimmed to **12,354 chars (−1,637 / −11.7%)** while adding all new CLI flags, `shot model.glb`, `--sockets`, `(c, fi)`, `fbmLoop`, `sprites3d`, `rig3d.joints`, and `mounts` |

---

## Part 1 — Measured Performance Optimizations

All measurements below were taken via **5-round alternating benchmarks** (flipping `HEAD` / `current` order on every round to cancel laptop thermal drift) and verified **100% byte-for-byte identical** against `HEAD`. See [perf-notes.md](perf-notes.md#mounts-iteration-giflzw-sub-blocks-png-encoding-and-profiler-sdf-attribution-2026-11) for full details.

### 1. Direct LZW Sub-Block Encoding & Zero-Copy Frame Path (`src/node/gif.ts`)

- **Root Cause:**
  `lzw()` in [gif.ts](../src/node/gif.ts) pushed encoded bytes one-by-one into a boxed JS `number[]` via a nested `emit()` closure, then `encodeGif()` sliced that array in 255-byte chunks into another `number[]` (`out`) before calling `Buffer.from(out)`. For `scale === 1` frames where `transparent || !prev`, `encodeGif()` also copied the full `idx` buffer into a separate `part` array even though `part` equaled `idx`.
- **What Changed:**
  - Replaced `lzw()` + post-chunking with `lzwSubBlocks(idx, minBits, buf)`: inlines the bit-packer, writes 255-byte GIF sub-blocks (length byte + 255 data bytes) directly into a pre-sized reusable `Uint8Array` (`lzwBuf`), and slices the exact encoded range into a `Uint8Array[]` chunk list concatenated once via `Buffer.concat(chunks)`.
  - Added a zero-copy `part = idx` fast path when `S === 1 && (transparent || !prev)` (no crop, no upscaling needed).
- **5-Round Alternating Medians (Byte-Identical Output):**
  - Transparent sprite `24×192×192`: **20.7 ms** (19.7..24.2) → **17.0 ms** (16.2..18.4) = **1.22× (−18.1%)** (disjoint ranges)
  - Noisy LZW-heavy `8×320×180`: **306.0 ms** (296.4..313.1) → **281.0 ms** (277.4..321.0) = **1.09× (−8.2%)**
  - Opaque `24×256×256`: **95.6 ms** (92.7..113.5) → **89.7 ms** (83.5..90.8) = **1.07× (−6.1%)** (disjoint ranges)

### 2. Two-Step CRC32 & Split Scanline Loops (`src/node/png.ts`)

- **Root Cause:**
  `chunk()` in [png.ts](../src/node/png.ts) allocated `Buffer.concat([head.subarray(4), data])` just to compute `crc32()` — copying the entire compressed `IDAT` payload on every PNG write.
- **What Changed:**
  - Switched `chunk()` to `crc32(data, crc32(head.subarray(4)))`, eliminating the extra buffer allocation and full payload copy.
  - Used `Buffer.allocUnsafe` for `raw` scanlines (every byte is overwritten) and split the indexed vs RGBA row loops so neither branches inside the inner pixel loop.
- **5-Round Alternating Medians (Byte-Identical Output):**
  - RGBA `512×512`: **27.0 ms** (26.2..28.6) → **25.5 ms** (25.0..25.8) = **1.06× (−5.7%)** (disjoint ranges)
  - Indexed `1024×512`: **10.4 ms** (10.1..10.6) → **10.3 ms** (9.8..10.8) = **1.01×** (deflate-bound; neutral)

### 3. Tried and Dropped (Measured & Rejected)

- **`ByteBuf` writer class in `gif.ts`:** Replaced `number[]` with a growable `ByteBuf` using `out.bytes([...])`. Alternating 5-round tests showed **0.94× (slower)** on opaque `24×256×256` GIFs due to temporary `[...]` allocations and per-code capacity checks. Dropped in favor of `lzwSubBlocks()` + `Buffer.concat(chunks)`.
- **`//# sourceURL=` and named `function _pxlSdf` in `src/core/sdf.ts`:** Tested as a way to label compiled SDF frames in V8's CPU profiler. Appending `//# sourceURL=` to `new Function()` caused a **20–25% regression (0.79×–0.80×)** on `mounts.px.js` because V8 leaves its anonymous-script fast path and registers every compiled function in the debugger source-URL table; naming the returned function also regressed vs the arrow function. Reverted `src/core/sdf.ts` completely back to `HEAD` and moved attribution into [profile.ts](../src/node/profile.ts) at zero runtime cost.
- **Zero-allocation ray/slab/cluster refactor in `src/core/surface.ts`:** Eliminated temporary `[t0, t1]` and `{ o, d }` ray allocations and scalarized the 4-neighbor passes. Verified 188/188 pixel-identical, but alternating benchmarks showed only **1.025× (−2.4%)** on `examples/sdf/fields.px.js` (722.0 ms [626.1..851.6] → 704.5 ms [587.5..751.0]) and **1.030× (−2.9%)** on 12 mount frames (1249.5 ms → 1213.5 ms) — well inside laptop thermal noise, since ~90% of `surface()` time is spent inside the compiled SDF distance and art sweep closures. Reverted to keep `surface.ts` simple and diff-minimal.

---

## Part 2 — CLI Tools, DSL Ergonomics & Diagnostics

### 4. Native 3D Reference Model Turnarounds: `pxl shot <model.glb | model.obj>`

- **Motivation:**
  Designing realistic quadruped mounts (wolves, warhorses, bulls, bears, mechanical walkers) from reference `.glb`/`.obj` models required writing ad-hoc Python/Node scripts to project the mesh from `pxl`'s 5 orthographic headings (`S, SW, W, NW, N`) and inspect its real `W × D × H` bounding ratios.
- **What Changed ([model3d.ts](../src/node/model3d.ts), [cli.ts](../src/node/cli.ts)):**
  - Added a self-contained glTF 2.0 binary (`.glb`) and Wavefront `.obj` (+ `.mtl`) loader that converts Y-up coordinates into `pxl`'s Z-up frame `(x, -z, y)` (the exact inverse of [files3d.ts](../src/core/files3d.ts)'s `yUp`, preserving handedness and winding).
  - Supports multi-node glTF scene graphs (`matrix` or TRS quaternions), all glTF accessor component types (`5120..5126`, normalized integers, `byteStride`), `TRIANGLES`/`TRIANGLE_STRIP`/`TRIANGLE_FAN`, skips zero-scale animation frames (matching `pxl`'s own `export3d` `.glb` layout), converts linear `baseColorFactor` to sRGB, and decodes embedded `baseColorTexture`s (PNG natively via `decodePng()`; JPEG/WebP via an optional in-memory `ffmpeg` pipe fallback).
  - Orthographic Z-buffered scanline rasterizer aligned with `pxl`'s `orthoBasis({ kind: "side", yaw: 180 - heading, pitch })` supporting `--dirs 5|8|4|1` (or comma-separated directions/angles), `--pitch DEG` (default 20°), `--size PX` (default 160), `--grey`, `--scale`, and `--out FILE.png`.
  - Prints vertex/triangle/material/texture counts and `bounds (W x D x H)` with normalized `W/H`, `D/H`, and `D/W` ratios.
- **Verification:**
  Tested on `export3d`-generated `.glb` and `.obj` files in [node.test.ts](../test/node.test.ts), and visually verified on real multi-material textured reference models (including a 49k-vertex quadruped `.glb` and a 1.08M-vertex / 1.97M-triangle mechanical `.glb`).

### 5. Socket Overlay Inspection: `pxl shot --sockets`

- **Motivation:**
  Aligning rider `seat`, `bridle`, `hitch`, and `driver` sockets across 5 directions and multi-frame walk/rear/fall cycles meant repeatedly writing temporary PNG-overlay scripts to see where sockets actually landed in pixel coordinates.
- **What Changed ([shot.ts](../src/node/shot.ts), [cli.ts](../src/node/cli.ts)):**
  - Added `--sockets` to `pxl shot`. Draws a compact 5×5 colored crosshair (bright white center pixel + colored arms + dark diagonal halo for contrast on both dark and bright pixels) for every named socket on stills, multi-row shots, groups/globs (threading both `boxes` and `sockets` through `membersRow`), `--vs`, and `--gif`.
  - Prints a color-coded legend (`sockets: seat cyan [6,5], bridle magenta [3,4]`), omits static `[x,y]` when a socket animates across frames, and reports `outside the frame: ...` if any socket falls outside the canvas bounds.
- **Verification:**
  Tested for exact center/arm pixels, animated sockets, out-of-frame warnings, and `--gif` integration in [node.test.ts](../test/node.test.ts).

### 6. Animation Callback `(c, fi)`, `frames`/`ms` Validation & Static-GIF Detection

- **Motivation:**
  Writing `anim("walk", { frames: 6, fps: 8 }, (c, fi) => ...)` silently passed `undefined` for `fi`, producing a multi-frame GIF whose frames were all identical — with zero warning from `pxl build` or `pxl shot --gif`. Similarly, passing mismatched `frames: 6, ms: [100, 100, 100]` silently ignored one of the two.
- **What Changed ([build.ts](../src/core/build.ts), [project.ts](../src/core/project.ts), [gif.ts](../src/node/gif.ts), [output.ts](../src/node/output.ts), [cli.ts](../src/node/cli.ts), [pxl.d.ts](../types/pxl.d.ts)):**
  - `runItems()` invokes item callbacks as `(c, c.frame)` (100% backward-compatible with `(c) => ...`).
  - `readsClock()` also recognizes 2-argument callbacks (`v.length >= 2`) so 1-frame anims that take `(c, fi)` still trigger the helpful 1-frame clock warning.
  - `animTimeline()` throws a clear `PxError` when both explicit `frames: N` and an `ms: [...]` array are given with different lengths.
  - `encodeGif()` accepts `onInfo?: (info: { frames: number; unique: number }) => void`; `pxl build` appends `-- static: all N frames identical` and `pxl shot --gif` prints `warning: all N frames are identical (static GIF)` whenever a multi-frame GIF has only 1 unique frame.
- **Verification:**
  Tested in [anim.test.ts](../test/anim.test.ts) and [node.test.ts](../test/node.test.ts).

### 7. Duplicate-Hex `swap` / `slots` Collision Warnings (Caught a Live Bug!)

- **Motivation:**
  Because `recolor()` and `swap` operate on resolved RGBA pixel values, two distinct palette keys that share the exact same hex color cannot be swapped to two different targets — the second entry silently wins and corrupts the first material.
- **What Changed ([build.ts](../src/core/build.ts), [canvas.ts](../src/core/canvas.ts), [project.ts](../src/core/project.ts)):**
  - Added a duplicate-hex check across asset `opts.swap`, `stamp`/`recolor`/`layer` `swap`, and `sheet` `slots`. Warns whenever two distinct keys in the same `swap` resolve to the same RGBA color and map to different target colors (silent when both map to the same target).
- **Immediate Real-World Catch:**
  Running `pxl build examples/hd2d/mounts.px.js` immediately flagged that [mounts.px.js](../lib/characters/mounts.px.js) had assigned the exact same 5 default hexes to barding metal (`ЮЯЁЄІ`) as `kit.px.js`'s rider plate armor (`жзийк`), causing horse barding swaps to silently overwrite mounted rider armor colors! Fixed [mounts.px.js](../lib/characters/mounts.px.js) to use unique placeholder hexes (`#181c2c`, `#384054`, `#67707f`, `#a7abae`, `#f2f0ea`); `examples/hd2d/mounts.px.js` now builds with 0 warnings.
- **Verification:**
  Tested across asset `swap`, `stamp`/`recolor` `swap`, and `sheet` `slots` in [core.test.ts](../test/core.test.ts).

### 8. Standalone `rig3d.joints(body, pose, heading)`

- **Motivation:**
  Computing a rider's world-space seat, hand, or stirrup positions for mounted composites and rein paths required calling `jointsOf()` — which was internal to `rig3d.ts`, forcing art files to re-implement joint kinematics by hand.
- **What Changed ([project.ts](../src/core/project.ts), [pxl.d.ts](../types/pxl.d.ts)):**
  - Exposed `rig3d.joints(body, pose, heading)` directly on the `rig3d` DSL global, calling `jointsOf(bodyOf(body), pose, heading)` without registering any assets.
- **Verification:**
  Tested in [core.test.ts](../test/core.test.ts).

### 9. Compiled SDF Attribution in `pxl build --profile`

- **Motivation:**
  In SDF-heavy builds (`mounts.px.js`, `traveler.px.js`), V8's sampling profiler emits `callFrame.url === ""` for `new Function()`-compiled SDF distance functions. `profileReport()` skipped every node with `!url`, making the single biggest CPU consumer disappear from `and in pxl:`.
- **What Changed ([profile.ts](../src/node/profile.ts)):**
  - Attributed samples matching `!url && (functionName === "" || functionName === "anonymous")` to `(compiled sdf) src/core/sdf.ts (generated)` while continuing to ignore named Node internals (`readFileUtf8`, `(root)`, `(idle)`).
  - Zero runtime cost: `src/core/sdf.ts` remains completely untouched.
- **Verification:**
  Verified both via unit test in [node.test.ts](../test/node.test.ts) (testing `""`, `"anonymous"`, and ignoring `readFileUtf8`) and live on `pxl build examples/hd2d/mounts.px.js --no-cache --profile --only m_wolf_stand_sw` (showing `(compiled sdf) src/core/sdf.ts (generated)` cleanly at #1 in `and in pxl:`).

### 10. `test/examples.test.ts` Ergonomics & `font5x7` Glyphs

- **What Changed:**
  - [examples.test.ts](../test/examples.test.ts): `PXL_UPDATE=1` now prints which files were updated/removed and exits 0 instead of still failing `assert.equal` against the pre-update snapshot; normal mismatches print the exact differing/removed filenames and the exact `PXL_UPDATE=1` command.
  - [font5x7.px.js](../lib/ui/font5x7.px.js): added missing `;` and `_` glyphs (0 visual diff on existing examples).

---

## Part 3 — `SKILL.md` & Reference Documentation Optimization

- **`SKILL.md` ([SKILL.md](../SKILL.md)):**
  - Audited against the 14,000-character map budget (`test/docs.test.ts`). Before this iteration it sat at **13,991 chars** (9 chars from the limit) while missing newer workflow tools.
  - Consolidated verbose repetition and synced all new capabilities (`pxl shot <model.glb|model.obj>`, `--sockets`, `--boxes`, `--out FILE.png/.gif`, `ascii --anchor --parts --at`, `compare --pixels`, `(c, fi)`, `fbmLoop`, `sprites3d`, `rig3d.joints`, `kit`, and `mounts`).
  - Final size: **12,354 chars (−1,637 chars / −11.7%)**, preserving every route and command while leaving ample headroom.
- **`reference.md` ([reference.md](../reference.md)) & `types/pxl.d.ts` ([pxl.d.ts](../types/pxl.d.ts)):**
  - Documented `(c, fi)`, `frames`/`ms` validation, static-GIF warnings, duplicate-hex `swap` warnings, `rig3d.joints()`, `pxl shot <model.glb|model.obj>`, `pxl shot --sockets`, and `--profile` compiled SDF attribution.
  - All 5 automated checks in [docs.test.ts](../test/docs.test.ts) pass.

---

## Part 4 — Token-Economy & Contact-Sheet CLI Improvements

Added after a quantitative analysis of the full session transcript (5,697 steps, 1,470 `read_file`s, 625 image loads, 117 multi-process `pxl shot` chains) to cut context/vision token burn without sacrificing visual or diagnostic quality:

- **Single-process contact sheets (`pxl shot` `a+b` & `--cols N`)** ([cli.ts](../src/node/cli.ts), [shot.ts](../src/node/shot.ts)): joining names with `+` (`wolf_s+wolf_w horse_s+horse_w`) puts labelled cells side by side on each row (stripping only the sheet-wide shared prefix), and `--cols N` packs entries, glob members, or `--gif` clips into an `N`-column grid in one Node process and one PNG — replacing multi-process shot chains and reducing vision image loads by 3–6×.
- **Filtered file symbol map (`pxl list --own --find <words>`)** ([list.ts](../src/node/list.ts), [cli.ts](../src/node/cli.ts)): unwraps top-level `{ ... }` scope blocks (used across `lib/*.px.js` such as `kit.px.js` and `mounts.px.js` so their internals stay visible to `pxl list`), adds `--own` to skip included files, and adds `--find` to filter statements, functions, consts, groups, and sheets to matching entries with exact line ranges — replacing broad `Select-String` dumps and 40 KB reads of multi-thousand-line `.px.js` files.
- **Tight ASCII cropping (`pxl ascii --trim`)** ([render.ts](../src/core/render.ts), [cli.ts](../src/node/cli.ts)): crops transparent margins while preserving absolute canvas x/y rulers (`bounds: x,y wxh (of WxH)`), working on both color and `--parts` dumps.
- **Compact output (`--quiet` / `-q` on `pxl build` and `pxl shot`)** ([cli.ts](../src/node/cli.ts)): suppresses non-warning asset/LOOK chatter while always keeping warnings, errors, static-GIF alerts, `--diff`, `--boxes`, `--sockets`, and `--profile` output intact.

