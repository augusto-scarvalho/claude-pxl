# Fire Slime Iteration: Engine Optimizations & DSL Improvements

This document records every performance optimization, DSL/DX improvement, and correctness/reliability fix added to `pxl` after building an animated 3D jumping fire slime scene (`160×160` + `480×480` HD `sizes` render, 24 frames at 16 fps, SDF volcanic rocks and slime dome, textured floor, dynamic point lamps, procedural fluid fire shader, particle emitters, `glow()`, and `post()` bloom/fog/vignette).

Every change below corresponds directly to a real bottleneck, bug, misleading diagnostic, or boilerplate workaround encountered during that production workflow.

---

## Summary Table

| # | Area | Change | Key Files | Motivation | Measured / Practical Impact |
|---|---|---|---|---|---|
| 1 | Perf | Scaled GIF encoding (`scale`, `palette`, `onPalette`) & flat k-means | `src/node/gif.ts`, `src/node/output.ts`, `src/node/cli.ts` | 4× previews & `--share` re-scanned/quantized `S²×` pixels and allocated `N` upscaled `Img`s | `encodeGif` 603 → 464 ms; −239 to −306 MB peak RSS; byte-identical output |
| 2 | Perf + DX | `applyGlow` precomputed kernel, exact interior skip, single-color path & HD `pixel` auto-scaling | `src/core/glow.ts`, `src/core/build.ts`, `src/core/model.ts` | `applyGlow` took 890 ms and HD `sizes` halos were `K×` thinner than 1× | Dropped completely out of top-10 profiler hotspots; 1×/HD visual parity |
| 3 | Perf | `drawMesh` empty-faces fast path, flat-floor `SunMap` skip, zero-alloc `texel()`, HD block-stepping | `src/core/mesh.ts` | `drawMesh` (1.3 s) + raster (523 ms) dominated frame time; empty-face sprite passes rebuilt full buffers | `drawMesh` 1.3 s → 572 ms (−56%); raster 523 → 172 ms (−67%) |
| 4 | Perf | Incremental `SunMap.tri()` & faster `shine()` lamp loop | `src/core/sunlight.ts` | `shine` (872 ms) and `SunMap.tri` (598 ms) spent 1.47 s on per-pixel `sqrt` and barycentrics | Both dropped completely out of top-10 profiler hotspots |
| 5 | DX + Check | `sprites3d()` op, `unlit` on `mesh()` sprites, smarter `pxl check` lit-side filter | `src/core/canvas.ts`, `src/core/mesh.ts`, `src/core/describe.ts`, `src/node/check.ts` | Needed `mesh(CAM, [], {}, { sprites })` hack, which clobbered `img.world` and triggered false `lit side` warnings on flames/sparks | Clean 3D billboard compositing, preserved world lighting, 0 false warnings |
| 6 | DX | Self-luminous `surface()` materials (`emit`) & `unlit: true` on `surface()`/`voxels()` | `src/core/surface.ts`, `src/core/project.ts` | Glowing slime/embers darkened under `light: "mesh"` unless hijacking `light: LIGHT` | Explicit intent; supports per-material bloom (`emit`) and unlit ramp shading (`unlit`) |
| 7 | DX | `effect("emit", { keep: true })` | `src/core/effects.ts` | Marking flames as emitting bleached crimson/orange bands toward white | Preserves exact RGB while still writing `img.emit` for bloom & lighting |
| 8 | DX | Built-in `fbmLoop()` global & organic `flame(..., { style: "plume" })` | `src/core/util.ts`, `src/core/index.ts`, `src/core/canvas.ts` | Default `flame()` looked spiky; fluid fire required hand-rolling periodic cylindrical 3D fBm | Reusable seamless flowing noise + organic curling flames out of the box |
| 9 | DX | `field.when(show)` & `field.scale(0)` empty-field collapse | `src/core/sdf.ts`, `src/core/surface.ts`, `src/core/volume.ts`, `src/core/decal.ts` | Conditional SDFs or scale-to-0 animations threw (`scale > 0`) or required hacks | Clean animated pop-in/out and conditional SDF geometry with zero evaluation cost when hidden |
| 10 | DX + Perf | `field.mat(name, { override: true })` & documented `make3d.*` materials | `src/core/sdf.ts`, `reference.md` | `make3d.rock({ moss: 0 })` still required dummy `stone`/`moss` in `mats` and ran impure `fbm3` moss paint (215 ms / 250 traces) | Eliminates dummy materials and impure repainting; rock outcrops become 100% cache-pure |
| 11 | DX | `decal()` transform tracking through wrapper nodes (`peelMoves`) & unlit decal safety | `src/core/scatter.ts`, `src/core/decal.ts` | Wrapping an SDF in `.mat()`/`.paint()`/`.intersect()` broke `decal()` transform inheritance; `lit: false` failed without `ramps()` | Decals follow full transform chains regardless of `.mat`/`.paint`/`.intersect` ordering |
| 12 | Bugfix | Floating-SDF shadow screen-bbox projection (`01582f3`) | `src/core/surface.ts`, `src/core/volume.ts` | Airborne slime's shadow was clipped along a straight horizontal line at `T.lo[2]` | Shadows project cleanly all the way down to ground plane `z_world = 0` |
| 13 | Reliability | `writeAtomic()` with retry/fallback on Windows lock codes | `src/node/output.ts`, `src/node/cli.ts` | Windows Explorer/image previewers caused `EBUSY`/`EPERM` crashes when overwriting GIFs/PNGs | Resilient atomic replacement across `build`, `shot`, `describe`, and `blind` |

---

## Part 1 — Performance Optimizations

### 1. Scaled GIF Encoding, Palette Reuse & K-Means Optimization

- **Motivation / Symptom:**
  Building `fire_slime_scene` (160×160, 24 frames, `@4x` preview = 640×640) and `fire_slime_hd` (480×480, 24 frames) spent **891 ms in `medianCut`** and **603 ms in `encodeGif`**, while peak RSS hit **743 MB**. For every opaque animated scene, `writeOutputs()` encoded the 1× GIF, then allocated 24 upscaled `Img` buffers (`scaleImg(f.img, 4)` = 16× more pixels!), ran `scan()` over all 16× pixels, ran `medianCut()` a second time on the exact same color histogram, and diffed all 16× pixels frame-to-frame. `build --share N` and `shot --gif` repeated the same pattern.
- **Root Cause:**
  `encodeGif()` in [gif.ts](../src/node/gif.ts) had no notion of integer nearest-neighbor scaling or palette reuse, so callers in [output.ts](../src/node/output.ts) and [cli.ts](../src/node/cli.ts) pre-scaled every frame before encoding. Inside `medianCut()`, the k-means refinement pass also performed redundant object/array lookups and computed all three channel distances even when the green channel alone (weighted `4×`) already exceeded the current best distance.
- **What Changed & Design Rationale:**
  - Added `GifOpts = { scale?, palette?, onPalette? }` to `encodeGif()`. When `scale = S > 1`, `scan()`, `medianCut()`, palette indexing (`idx`), and dirty-rectangle detection all run at `1×` resolution; only the final changed rectangle `part` is nearest-neighbor expanded by `S × S` (filling row 0 horizontally and using `Uint8Array.copyWithin()` for the remaining `S - 1` rows) immediately before `lzw()`.
  - Because every `S × S` block in a pre-scaled image contains identical pixels, the color proportions (every count scaled by `S²`), quantized palette, dirty bounding box (`[x0*S, y0*S, fw, fh]`), and LZW input stream are **byte-for-byte identical** to pre-scaling.
  - `writeOutputs()` captures the 1× GIF's palette via `onPalette` and passes `{ scale, palette: ownPal }` to `--share` GIFs and opaque `2×..5×` `_preview/*.gif`s (transparent previews over a checkerboard and `scale >= 6` pixel-grid previews keep the existing `preview()` path because the checker/grid varies inside each block).
  - `cli.ts` (`shot --gif`) passes `{ scale: k }` directly to `encodeGif()`.
  - `medianCut()` k-means now uses flat `Int32Array`/`Float64Array` centroid arrays with a green-first early exit (`const dg = cg - pg[j]; const d = 4 * dg * dg; if (d >= bd) continue;`), preserving bit-exact results.
- **Verification & Impact:**
  Added byte-equivalence and palette-reuse tests in [anim.test.ts](../test/anim.test.ts). Peak build RSS dropped from 743 MB to 504 MB (unmodified scene) / 437 MB (refactored), and `encodeGif` dropped from 603 ms to 464 ms.

---

### 2. `applyGlow` Optimization & HD Art-Pixel Scaling

- **Motivation / Symptom:**
  Two problems appeared simultaneously in `fire_slime_scene` + `fire_slime_hd`:
  1. **Performance:** `applyGlow` spent **890 ms** (4% of the entire build) because the 480×480 HD scene had thousands of glowing yellow/white pixels and `applyGlow` evaluated `Math.hypot(dx, dy)` and `** 2` in nested `(2r+1)²` loops for every single glowing pixel — even solid interior pixels completely surrounded by other glowing pixels of the exact same color.
  2. **Visual inconsistency in `sizes` / `pixel` scenes:** Unlike `mesh()`, `surface()`, and `post()`, `glow("yYw", { r: 6 })` operated in picture pixels rather than art pixels. On `fire_slime_hd` (`sizes: { fire_slime_hd: 3 }`), `r: 6` became 2 art pixels wide (3× thinner than the 160×160 scene!).
- **Root Cause:**
  [glow.ts](../src/core/glow.ts) lacked a precomputed kernel, lacked an interior-cell check, always allocated a `Float32Array(w * h * 3)` RGB buffer even with a fixed `color` tint, and [build.ts](../src/core/build.ts) did not pass `main.k` into `applyGlow`.
- **What Changed & Design Rationale:**
  - Precomputed the circular kernel `(kdx, kdy, kf)` once per call.
  - Added an **exact interior-cell skip**: after resolving each cell's effective glow color (`tint ?? c`), any cell whose 4 cardinal neighbors carry the exact same effective color is strictly dominated in the per-pixel `max` kernel by at least one neighbor at every point other than `(gx, gy)` itself. We simply record self-weight `1` at `(gx, gy)` (preserving correctness for mixed `K > 1` blocks where some sub-pixels are non-source) and skip the `O(r²)` splat.
  - Added a **single-color fast path**: when `o.color` (`tint`) is set or `src.size === 1`, skips allocating and updating the `Float32Array(gw * gh * 3)` `rgb` buffer, computing `wt * tr/tg/tb` directly in the final pass.
  - Added `pixel?: number` and `px?: boolean` to `GlowOpts` ([model.ts](../src/core/model.ts), [project.ts](../src/core/project.ts)). When `pixel: K > 1`, `applyGlow` operates on the `⌈w/K⌉ × ⌈h/K⌉` art-pixel grid (cutting HD work by `K² ×` and matching `post()`'s convention). [build.ts](../src/core/build.ts) automatically passes `pixel: main.k` in `sizes`/`pixel` scenes unless `px: true` opts back into picture pixels.
- **Verification & Impact:**
  Added exact equivalence and `pixel`/`px` scaling tests in [glow.test.ts](../test/glow.test.ts). `applyGlow` dropped from **890 ms to under 150 ms** (completely disappearing from the top-10 profiler table), and `fire_slime_hd`'s glow now matches `fire_slime_scene` 1:1.

---

### 3. `drawMesh` Fast Paths, Zero-Alloc `texel()`, and HD Block-Stepping

- **Motivation / Symptom:**
  `drawMesh` was the #1 profiler hotspot at **1.3 s** (plus **523 ms** inside the triangle rasterizer closure). In `fire_slime_scene`, every frame made three `mesh()` calls: one for the flat volcanic floor quad (480×480 in HD!) and two face-less `mesh(CAM, [], {}, { sprites })` calls for flames and sparks. Every single call allocated full-frame `pos` (`Float32Array(W*H*3)`), `who` (`Int32Array(W*H)`), and `shade` (`Uint8Array(W*H)`), scanned all `W * H` pixels, built a `1024×1024` `SunMap` even for a single flat floor quad that cannot self-shadow, and in HD ran `texel()` (allocating a `[X, Y, Z]` array per pixel!) and `shine()` for every single picture pixel even though `block = 3` made every 3×3 block identical.
- **Root Cause:**
  [mesh.ts](../src/core/mesh.ts) treated every call uniformly regardless of whether faces existed, whether faces were coplanar on a flat ground plane, or whether `block > 1` duplicated values across `K × K` blocks.
- **What Changed & Design Rationale:**
  - **Empty-faces fast path (`faces.length === 0`):** Skips allocating `pos`, `who`, `shade`, and `c.raw`; skips the entire `O(W * H)` face shading, crease/outline, and contact-shadow loops; reuses `c.img.depth` in place when `opts.over` is set; and skips `SunMap` construction unless there are both shadow-casting sprites and lit sprites.
  - **Flat-floor `SunMap` skip:** When `faces.length > 0`, scans vertex heights along `UP`. If all vertices share one horizontal plane (`maxU - minU <= 1e-6`), the camera eye sits above that plane (`eye[UP] > z0`), the sun is above the horizon (`sunDir[UP] > 0.05`), and no sprite casts sun shadows, a flat floor cannot cast shadows onto itself — so building the `1024×1024` `SunMap` is skipped completely (note: `surface()` calls after `mesh()` still cast their own shadows independently via ray-marching!). Also ensures empty-face calls never overwrite `L.map` on `c.img.world`.
  - **Zero-allocation `texel()` and lifted `texColAt()`:** Replaced returning `[X, Y, Z]` tuples and per-pixel helper closures with flat coordinate math and a lifted `texColAt()` helper.
  - **Block-stepping rasterizer & raw-buffer neighbor cache:** When `Bk > 1` on a face without dissolve masks, evaluates barycentrics and world position once per `Bk × Bk` block and fills all `Bk × Bk` pixels in the block with identical `(z, pos, who)`. In the shading loop, when `(k, pos)` matches the left (`i - 1`) or top (`i - W`) opaque textured pixel, copies `c.raw[prev]` directly instead of calling `texColAt()` and `shine()` again (`B²×` fewer shading evaluations in HD!).
- **Verification & Impact:**
  Added empty-faces, flat-floor, and block-stepping tests in [mesh.test.ts](../test/mesh.test.ts). `drawMesh` dropped from **1.3 s to 572 ms (−56%)**, and the rasterizer dropped from **523 ms to 172 ms (−67%)**.

---

### 4. Incremental `SunMap.tri()` & Faster `shine()`

- **Motivation / Symptom:**
  `shine` spent **872 ms** and `SunMap.tri` spent **598 ms** — nearly **1.5 s** combined.
- **Root Cause:**
  In [sunlight.ts](../src/core/sunlight.ts):
  - `SunMap.tri()` recomputed full cross products `((x - x0) * ...)` from scratch at every pixel inside each triangle's bounding box.
  - `shine()` checked `L.emit.has(col)` even when `L.emit` was empty, iterated `L.lamps` via `for...of`, and computed `Math.hypot(dx, dy, dz)` (`Math.sqrt`) for every lamp even when the pixel was well outside the lamp's radius `l.r`.
- **What Changed & Design Rationale:**
  - `SunMap.tri()` precomputes `invA = 1 / area`, edge deltas `dy20/dx20`, `dy01/dx01`, and steps `w1`/`w2` incrementally across rows and columns.
  - `shine()` checks `L.emit.size > 0 && L.emit.has(col)`, iterates `lamps` by index, and tests `d2 >= lr * lr` before calling `Math.sqrt(d2)`.
- **Verification & Impact:**
  Both `shine` (872 ms) and `SunMap.tri` (598 ms) dropped completely out of the top-10 profiler hotspots.

---

### 5. Why `workers.ts` Was Intentionally Left Untouched

- **Consideration:**
  In `fire_slime`, `pxl build` ran all 24 scene frames on the main thread because scenes that compose sub-assets run on the main thread in `workers.ts` to keep the project cache and disk-store digest simple and deterministic.
- **Rationale:**
  Splitting scene frames across worker threads duplicates the entire `Project` (~90 MB per worker, as documented in [perf-notes.md](perf-notes.md#what-a-build-holds)) and adds IPC serialization overhead. Fixing the underlying algorithmic hotspots (`drawMesh`, `SunMap`, `shine`, `applyGlow`, `encodeGif`, and pure rock overrides) cut total build time from **24.1 s → 11.6 s** cold-to-warm (**2.9 s** warm) while *reducing* peak memory from **743 MB → 437 MB** (335 MB warm) without adding worker memory pressure or complexity.

---

## Part 2 — 3D / SDF / Scene DSL & DX Improvements

### 6. Dedicated `sprites3d()` Op, `unlit` Sprites, and `pxl check` Lit-Side Accuracy

- **Motivation / Symptom:**
  To composite 2D procedural flame and spark animations into the 3D scene's depth buffer (in front of the back volcanic rocks, behind/around the slime), the only way was a clunky hack:
  ```js
  c.mesh(CAM, [], {}, { sprites: [{ name: "_slime_flames_3d", at: [0, Y0 + 0.04, j.z], blend: "screen", ... }] })
  ```
  This caused three distinct problems:
  1. Passing `[], {}` looked like a workaround and allocated full mesh buffers every frame (fixed above).
  2. Calling `c.mesh()` without `sun` **clobbered `c.img.world`** when it ran before later `surface()` calls, silently breaking inherited world lighting unless you knew about the internal `over` flag.
  3. **`pxl check` emitted false-positive `lit side` warnings** on glowing flames and sparks placed in 3D, because `check.ts` checked every placed sprite's pixel brightness against the scene's directional sun — even when the sprite was additive (`blend: "add"`), screen-blended (`blend: "screen"`), self-emitting (`img.emit`), or explicitly unlit!
- **Root Cause:**
  [canvas.ts](../src/core/canvas.ts) had no dedicated op for depth-tested billboard overlays; [mesh.ts](../src/core/mesh.ts) had no `unlit` flag on `MeshSprite`; and [describe.ts](../src/core/describe.ts) / [check.ts](../src/node/check.ts) did not record whether a placement was self-luminous/unlit.
- **What Changed & Design Rationale:**
  - Added `sprites3d(view, sprites, opts?)` to [canvas.ts](../src/core/canvas.ts) and registered it in `OPS`, `SIGNATURES`, `OP_OPTS` ([project.ts](../src/core/project.ts)) and [pxl.d.ts](../types/pxl.d.ts). It sets `over: true`, passes empty faces, inherits `c.img.world` lighting unless `unlit: true` (or custom `sun`) is specified, and never overwrites `c.img.world`.
  - Added `unlit?: boolean` on `MeshSprite` (and as a convenience top-level option on `sprites3d()`): skips `shine()` world shading for that sprite.
  - Added `unlit?: boolean` to `Placement` in [describe.ts](../src/core/describe.ts). `mesh.ts` sets it when `s.unlit`, `s.blend === "add" || s.blend === "screen"`, or all opaque pixels of the sprite are marked in `img.emit`. [check.ts](../src/node/check.ts) skips lit-side checks for placements with `p.unlit`.
- **Verification:**
  Tested in [mesh.test.ts](../test/mesh.test.ts) (depth occlusion, world lighting inheritance, `unlit: true`, and zero `pxl check` lit-side warnings for `unlit`/`add`/`screen`/emitting sprites).

---

### 7. Self-Luminous `surface()` Materials (`emit`) & `unlit: true`

- **Motivation / Symptom:**
  After drawing the volcanic floor with `mesh(..., { sun: "#7684c8", sky: "#32365e" })`, every subsequent `surface()` call automatically inherits `light: "mesh"` and multiplies its ramp colors by the cool dim sun/sky via `shine()`. For the volcanic rocks that was great, but for the **glowing molten fire slime** and **smoldering ground embers**, it turned bright yellow/orange fire into muddy brown! The only escape hatch was passing `light: LIGHT` explicitly to disable `light: "mesh"`, which was non-obvious and also prevented `surface()` materials from emitting into `img.emit` for `post()` bloom.
- **Root Cause:**
  [surface.ts](../src/core/surface.ts) had no per-material `emit` property and no `unlit` flag on `SurfaceOpts` / `VOXEL_OPTS`.
- **What Changed & Design Rationale:**
  - Added `emit?: boolean | number` (`0..1`, `true` = `1`) to `SurfaceMat`. Emitting materials skip `shine()` world darkening AND write `c.img.emit[j] = Math.round(255 * em)` so `post()` bloom picks them up automatically (and non-emitting surface pixels that occlude an emitting pixel cleanly clear `c.img.emit[j] = 0`).
  - Added `unlit?: boolean` to `SurfaceOpts` (`SURFACE_OPTS` and `VOXEL_OPTS`): skips `shine()` darkening on the whole field while keeping normal ramp shading from `light` (or `look3d()`) and without forcing bloom emission.
- **Verification:**
  Tested in [sdf.test.ts](../test/sdf.test.ts) (verifying `emit: true`, fractional `emit: 0.5`, `unlit: true`, and occlusion clearing `img.emit`).

---

### 8. Non-Destructive Emission Tagging: `effect("emit", { keep: true })`

- **Motivation / Symptom:**
  When marking `_slime_flames_3d` and `_ground_fire` as self-luminous for `post()` bloom and unlit rendering, `effect("emit", { strength: 0.5 })` added 50% linear light to every pixel — **bleaching the rich crimson (`#8f1d24`), vermilion (`#cc301c`), and orange (`#f05c18`) flame bands into pale washed-out pink/white**. The workaround was dropping `strength: 0.08`, which weakened bloom intensity just to stop the colors from bleaching!
- **Root Cause:**
  `EFFECTS.emit` in [effects.ts](../src/core/effects.ts) coupled RGB brightening and `out.emit` mask strength to the single `strength` parameter.
- **What Changed & Design Rationale:**
  - Added `keep?: boolean` (default `false`) to `EFFECTS.emit`. When `keep: true`, pixels' RGB colors remain **100% untouched** while `out.emit[i]` is still populated at `Math.round(255 * s)` (respecting `pulse`).
  - **Preserved invariant:** `effect("emit", { strength: 0 })` remains a complete no-op (returning `src` unchanged without allocating `out.emit`), which existing tests rely on — hence a dedicated `keep: true` flag rather than changing `strength: 0` semantics.
- **Verification:**
  Tested in [effects.test.ts](../test/effects.test.ts).

---

### 9. Seamless Flowing Noise `fbmLoop()` & Organic `flame(..., { style: "plume" })`

- **Motivation / Symptom:**
  The initial fire used `flame()` (which draws separate pointed triangles/tongues) and the user rightly observed: *"o fogo está mais parecido com espetos se mexendo do que com chamas"* ("the fire looks more like moving spikes than flames"). Achieving smooth, continuous upward-flowing fire that looped seamlessly over 24 frames with zero crossfade ghosting required writing a custom cylindrical 3D fBm helper (`advectNoise`) and a 90-line fire shader by hand.
- **Root Cause:**
  `pxl` had `fbm(x, y)` (static 2D) and `sdf.fbm(x, y, z)` (3D), plus `seamless(fn, w, h)` (spatial crossfade), but no built-in periodic cylindrical advection helper — and `Canvas.flame()` only supported its legacy spiky `"tongues"` algorithm.
- **What Changed & Design Rationale:**
  - Exported `fbmLoop(x, y, phase, { scale = 8, period = 24, cycles = 2, seed = 1, octaves = 3, axis = "y" })` from [util.ts](../src/core/util.ts) / [index.ts](../src/core/index.ts) and bound it as a global in [project.ts](../src/core/project.ts). By mapping `a = 2π * (flow / period + phase * cycles)` onto a circle `(cos a * 0.85, sin a * 0.85)` in 3D `fbm3`, features advect continuously along `axis` and wrap **exact bit-for-bit at `phase = 0` and `phase = 1`** with zero crossfade ghosting.
  - Extended `Canvas.flame()` ([canvas.ts](../src/core/canvas.ts)) with `style?: "tongues" | "plume"` plus `phase`, `cycles`, `curl`, `wide`. Default `style: "tongues"` is 100% bit-identical to before so existing assets don't drift; `style: "plume"` renders a cohesive organic fire plume using two-pass `fbmLoop` domain warping + stepped pixel-art temperature ramp.
- **Verification:**
  Tested in [effects.test.ts](../test/effects.test.ts) (verifying `fbmLoop` periodicity at `phase = 0` vs `1`, `axis: "x"` vs `"y"`, and `flame({ style: "plume" })` seamlessness and motion). Refactored `fire_slime.px.js` replaces its custom `advectNoise` directly with `fbmLoop`.

---

### 10. Conditional & Zero-Scale SDFs: `field.when(show)` & `field.scale(0)`

- **Motivation / Symptom:**
  When animating temporary 3D elements (ground fire flaring up and dying down, impact rings, or popping embers), trying to shrink an SDF down to `scale(0)` threw `scale must be > 0`, and conditionally toggling a branch of an SDF union required building awkward dummy micro-spheres buried underground.
- **Root Cause:**
  [sdf.ts](../src/core/sdf.ts) required every `SdfNode` to have a non-empty bounding box (`lo <= hi`) and strictly positive scale factors, and [surface.ts](../src/core/surface.ts) / [volume.ts](../src/core/volume.ts) / [decal.ts](../src/core/decal.ts) assumed `T.lo[i] <= T.hi[i]`.
- **What Changed & Design Rationale:**
  - Added `EMPTY_PART` (`lo = [Infinity, Infinity, Infinity]`, `hi = [-Infinity, -Infinity, -Infinity]`, `d = Infinity`) and `isEmpty(lo, hi)` helper in [sdf.ts](../src/core/sdf.ts).
  - Added `field.when(show: boolean | ((c: Clock) => boolean))`: when falsy at the current clock, compiles directly to `EMPTY_PART` without evaluating the inner subtree.
  - Allowed `0` in `field.scale(k)` (and `[sx, sy, sz]` with any component `0`): collapses cleanly to `EMPTY_PART` while negative scales still throw.
  - Propagated empty bounds cleanly through `union` (dropping empty children; empty if all empty), `intersect` (empty if any child empty), `subtract` (empty if first child empty; ignores empty cutters), transforms, `compileDensity()`, `surface()`, `surfaceSize()`, `volume()`, and `decal()`.
- **Verification:**
  Tested across all boolean ops, transforms, `surface()`, `surfaceSize()`, `volume()`, and `decal()` in [sdf.test.ts](../test/sdf.test.ts).

---

### 11. Material Override `field.mat(name, { override: true })` & `make3d.*` Material Contracts

- **Motivation / Symptom:**
  Using `make3d.rock({ size, moss: 0, seed }).field.mat("rock")` for volcanic basalt outcrops failed with:
  `surface: material 'stone' is not in mats` — and after adding `stone`, failed again with `material 'moss' is not in mats`, even though `moss: 0` was explicitly passed! Worse yet, `--profile` revealed that `make3d.rock`'s internal `.paint("moss", ...)` callback was an **impure closure running `fbm3`**, costing **215 ms across 250 rock traces** every single build even though `moss` was mapped to the same basalt ramp as `rock`!
- **Root Cause:**
  1. In [builders.ts](../src/core/builders.ts#L166-L171), `make3d.rock()` assigns `.mat("stone")` and `.paint("moss", ...)` inside its field, and outer `.mat("rock")` only provided a fallback when inner nodes had no material.
  2. Internal material names of `make3d.*` builders were undocumented in [reference.md](../reference.md).
- **What Changed & Design Rationale:**
  - Added `field.mat(name, { override?: boolean })` in [sdf.ts](../src/core/sdf.ts). When `override: true`:
    - Increments a `skipMat` counter during `compile()` so all inner `.mat()`, `.paint()`, and `.paintBy()` assignments are skipped and replaced by `name`, while **preserving inner `.part()` names** for `pxl steps` and `inner` outlines.
    - Excludes overridden inner material names from `C.mats` (so `surface()` no longer demands dummy `stone`/`moss` entries in `mats`).
    - Marks overridden inner paint callbacks as unused in `looksOf()` and `notPure()`, so `make3d.rock({ moss: 0 }).field.mat("rock", { override: true })` becomes **100% cache-pure** and skips the `fbm3` moss evaluation completely!
  - **Preserved invariant:** Default `make3d.rock()` behavior is unchanged so existing library scenes keep their moss intact.
  - Documented all 8 `make3d.*` builders' internal material names in [reference.md](../reference.md).
- **Verification:**
  Tested in [sdf.test.ts](../test/sdf.test.ts). In `fire_slime.px.js`, removing dummy `stone`/`moss` from `MATS`, adding `{ override: true }` on `basaltRock`, and wrapping `withFireBounce` in `pure()` eliminated 100% of impure repaint warnings (`0` impure traces/paints remaining).

---

### 12. `decal()` Transform Tracking (`peelMoves`) & Unlit Decal Safety

- **Motivation / Symptom:**
  When pinning `slime_face` onto `fireSlime` via `decal("slime_face", { on: fireSlime, point: [0, -0.47, 0.39], lit: false })`, wrapping the base field in `.mat()`/`.paint()`/`.intersect()` before `.scale()`/`.rotate()`/`.at()` caused subtle failures if any transform sat inside a `.mat()`/`.part()`/`.paint()`/`.intersect()` wrapper — `peel()` stopped peeling at the first non-move wrapper node! Separately, `drawDecal()` unconditionally called `c.pal.stepMap(-1)` / `stepMap(1)` at startup, throwing `no ramps defined` even when `lit: false` never used ramps at all.
- **Root Cause:**
  `decal.ts` reused `scatter.ts`'s `peel()` helper, which intentionally stopped at wrapper nodes because `scatter()` separates the unmoved base SDF from its outer transforms.
- **What Changed & Design Rationale:**
  - Added a dedicated `peelMoves(f)` helper in [scatter.ts](../src/core/scatter.ts) used by [decal.ts](../src/core/decal.ts). `peelMoves` traverses through `mat`, `part`, `paint`, `paintBy`, `when`, and the primary child (`a`) of `intersect` and `subtract` to collect every `at`, `rotate`, `scale`, and `bend` transform along the chain, while leaving `scatter()`'s `peel()` behavior completely untouched.
  - Made `steps` lazy in [decal.ts](../src/core/decal.ts) (`const steps = lit ? [c.pal.stepMap(-1), c.pal.stepMap(1)] : undefined`) so `lit: false` decals work on palettes with no `ramps()` defined.
- **Verification:**
  Tested in [sdf.test.ts](../test/sdf.test.ts) (pinning decals onto fields with transforms nested inside `.mat()`/`.part()`/`.intersect()`, and `lit: false` decals without `ramps()`).

---

## Part 3 — Correctness & Platform Reliability Fixes

### 13. Floating-SDF Shadow Screen-BBox Clipping Fix (`01582f3`)

- **Motivation / Symptom:**
  The user noticed that on airborne jump frames, the bottom edge of the slime's cast shadow on the cavern floor was **sliced off in a straight horizontal line** instead of forming a round ellipse.
- **Root Cause:**
  In [surface.ts](../src/core/surface.ts#L813) and [volume.ts](../src/core/volume.ts#L199), the screen bounding box of pixels tested for cast shadows projected the SDF's 8 bounding-box corners down to `T.lo[2]` — the **bottom of the floating field itself**, not the ground plane (`z_world = 0`)! When the slime jumped to `z = 1.24 m`, its shadow ray-march never checked screen rows below the projection of `z = 1.24 m`, cleanly truncating the lower half of the shadow.
- **What Changed:**
  Changed the projection floor from `T.lo[2]` to `const foot = Math.min(T.lo[2], -cam.at[2])` (world ground `z = 0`, or lower if the field extends below `z = 0`). Fixed and pushed in commit `01582f3`.

---

### 14. Atomic File Writes for Windows Lock Resilience (`writeAtomic`)

- **Motivation / Symptom:**
  On Windows, re-running `pxl build` or `pxl shot` while Windows Explorer, Photos, or an IDE tab previewed an existing GIF/PNG threw intermittent `EBUSY` / `EPERM` errors on `writeFileSync(path, data)` and could leave truncated half-written files behind.
- **Root Cause:**
  [output.ts](../src/node/output.ts) and [cli.ts](../src/node/cli.ts) called `writeFileSync()` directly onto target output paths.
- **What Changed & Design Rationale:**
  - Implemented and exported `writeAtomic(filePath, data)` in [output.ts](../src/node/output.ts): writes to a unique sibling temp file (`${filePath}.${pid}.${threadId}.${seq}.tmp`), then `renameSync()`s it into place with up to 5 brief retries (cleaning up the temp file on failure) and a final direct-overwrite fallback if a viewer holds a share-write handle that blocks rename (`EBUSY`, `EPERM`, `EACCES`, `UNKNOWN`).
  - Wired `writeAtomic()` into `output.ts`'s `write()` (covering all PNGs, GIFs, JSONs, previews, sheets, share exports) and `cli.ts`'s `_shot/*.gif`, `_shot/*.last.json`, `_describe/*.json`, and `_blind/key.json`.
- **Verification:**
  Tested in [anim.test.ts](../test/anim.test.ts) (verifying atomic overwrite and zero leftover `.tmp` files).

---

## Part 4 — End-to-End Benchmark Summary

Command:
```powershell
node bin/pxl.js build out/fire_slime/fire_slime.px.js --profile --only fire_slime_scene,fire_slime_hd --out out/fire_slime
```

| Stage | Total Time | `fire_slime_scene` (160×160 @4x) | `fire_slime_hd` (480×480 @1x) | Peak RSS | Impure Repaints |
|---|---:|---:|---:|---:|---|
| **Baseline** (pre-optimization engine + original scene) | 24.1 s | 13.7 s | 10.3 s | 743 MB | 215 ms / 250 rock traces |
| **Engine optimizations only** (unmodified scene, cold-to-warm) | 14.2 s (**1.70×**) | 6.2 s (**2.21×**) | 7.9 s (**1.30×**) | 504 MB (**−32%**) | 215 ms / 250 rock traces |
| **Engine + refactored scene** (`sprites3d`, `override`, `pure`, `fbmLoop`, `emit { keep }`, `unlit`; cold-to-warm) | 11.6 s (**2.08×**) | 4.7 s (**2.91×**) | 6.9 s (**1.49×**) | 437 MB (**−41%**) | **0** |
| **Warm store** (subsequent rebuilds) | 2.6–2.9 s | 0.9–1.0 s | 1.6–1.8 s | 331–335 MB | **0** |

Visual parity and checks on the refactored scene:
- `pxl check out/fire_slime/fire_slime.px.js`: **exit 0, 0 warnings**.
- `pxl shot` on `fire_slime_scene` (frames 0, 6, 11, 18) and `fire_slime_hd` (frames 6, 11): verified rich unbleached flames, round unclipped airborne shadows, crisp volcanic basalt facets, and 1×/HD glow parity.
