# Tier 1 & Tier 2 Backlog Improvements (2026-11)

Summary of four sequential waves addressing high-priority backlog items across project infrastructure, `rig3d` combat
ergonomics and visual quality, large-roster build performance and memory bounds, and HD-2D tactical scene/VFX rendering.

## Wave 1 — Project Infrastructure & Safety

- **Idempotent `include()` & scoped `look3d()`** (`src/core/project.ts`, `src/node/load.ts`):
  - Including the same file twice under matching `as` now runs once and replays its `pal()`/`ramps()`/`look3d()` additions
    when included with `{ palette: true }` (conflicting `as` on asset-defining files still errors).
  - Pure palette/style/profile files (that define no assets of their own) replay cleanly even across different `as`
    namespaces in diamond include graphs without re-executing top-level `const`/`function` declarations.
  - `look3d({ light?, mats? })` is now saved, cleared, and restored across non-shared `include()` boundaries so a library's
    internal 3D materials never leak into the caller (while `{ palette: true }` style includes such as `lib/styles/fields.px.js`
    continue to share `look3d`).
- **Normal/emission map suffix options & early clash detection** (`src/core/model.ts`, `src/core/project.ts`, `src/node/output.ts`, `src/node/check.ts`, `types/pxl.d.ts`):
  - `sheet()` now accepts `normalSuffix?: string` (default `"_n"`) and `emitSuffix?: string` (default `"_e"`), avoiding
    filename collisions with north/east directional sheets (`hero_n`, `hero_e`) and writing the exact filenames to `normalMap` /
    `emissionMap` in sheet JSON (both Aseprite hash/array `meta` and `grid` formats).
  - `pxl check` now warns early when an exported asset's `<name>_n` or `<name>_e` map would collide with another exported asset
    in the same output folder.
- **`pxl check` on kit-generated figures & `rig3d({ ink })` validation** (`src/core/project.ts`, `src/node/check.ts`):
  - `Project` records explicit `included: this.depth > 0` on `groups`, `views`, and `figures` so `pxl check` inspects figures,
    views, and groups produced by calling an included kit's maker (`hero32.character()`, `kit.character()`, `mounts.mount()`)
    from the main file, and resolves cross-namespace `views({ like })` references when unique.
  - `rig3d` validates `ink` against the active palette with contextual error `rig3d '<name>' ink` and key suggestions.

## Wave 2 — `rig3d` Combat Ergonomics & Visual Quality

- **Per-arm `elbow` hints & `armReach` check** (`src/core/rig3d.ts`, `src/node/check.ts`):
  - `Pose.elbow` accepts a shared `V3`, per-arm `[leftV3, rightV3]`, or `{ l?: V3; r?: V3 }`.
  - `poseFlaws()` now computes `armReach` (max hand distance past `upper + fore`) and `pxl check` warns when over-extended
    by more than `1.5 px` (ignoring normal walk swings while catching stretched combat/kneel hands).
- **Per-move frame size/pivot & explicit-frame clipping warning** (`src/core/project.ts`):
  - Each move in `rig3d(..., { moves })` accepts optional `w`, `h`, and `pivot` overriding the rig's default frame size
    (avoiding separate `rig3d()` definitions for wide attacks/dashes).
  - When explicit `w`/`h` clips painted non-ink pixels (or uninked bounds) at any frame edge, `rig3d` emits a `rig3d:` warning
    naming the clipped edges.
- **Enhanced `over`, `j.rod({ behind })`, and 3D `j.smear()`** (`src/core/rig3d.ts`, `src/core/project.ts`):
  - `rig3d({ over })` supports sub-part prefix matching (`"held"` matches `"held.guard"` / `"held.tip"`), `"depth"` (per-pixel
    depth test for all parts against a stamped `head`), and `{ parts: string[]; mode?: "part" | "pixel" }`.
  - `draw` hooks now support `j.rod(a, b, paint, { behind?: boolean })` and `j.smear(path, width, paint, { behind?: boolean })`
    for depth-tested 3D blade arcs (`V3[]` tip ribbons with constant or `(t) => px` width, or `[V3, V3][]` quad strips) that
    occlude behind the figure where the swing passes behind.
- **Surface anti-speckle & granular `clean`, plus `dress({ farBy })`** (`src/core/surface.ts`, `lib/characters/dress.px.js`):
  - `SurfaceMat.flat: true` flattens per-pixel checker speckle on thin 1–2 px parts (blades, shafts) by snapping each part's
    pixels of that material to their dominant tone.
  - `SurfaceOpts.clean` accepts `{ slivers?, specks?, keepGlint? }`, and sliver cutting is skipped under `inner: "dark"` where
    no 2-px black run exists.
  - `dress({ farBy })` skips far-limb darkening when left/right limb depth difference is within `farBy` px (default `0`
    preserves existing approved art pixel-for-pixel).

## Wave 3 — Scale: `pure()` Traces & Large-Roster Memory Relief

- **100% `pure()` distance fields across character & mount libraries** (`lib/characters/mounts.px.js`, `dress.px.js`,
  `traveler.px.js`, `crew.px.js`, `kit.px.js`) + **512-entry LRU factory cache** (`src/node/pure.ts`).
- **LRU-bounded `Project.cache` & post-export eviction** (`src/core/project.ts`, `src/node/output.ts`).
- **Alternating multi-run benchmarks vs `HEAD` (`cc2ab5c`, `PXL_WORKERS=1`, Node 24):**
  - Mounted riders warm trace-cache rebuild (5 rounds): **6.80 s** (5.79..8.05) → **2.45 s** (2.41..2.59) (**2.78×, −64.0%**).
  - `kit.character` warm trace-cache rebuild (5 rounds): **8.36 s** (7.66..9.63) → **3.35 s** (3.18..3.42) (**2.50×, −59.9%**).
  - `mounts_cavalry` cold build `--no-cache` (5 rounds): **5.24 s** (4.05..5.45) → **4.89 s** (4.40..5.03) (**1.07×, −6.7%**).
  - 800 × 256×256 normal-mapped assets (3 rounds): peak `maxRSS` **460.6 MB** (459.7..466.0) → **119.4 MB** (119.4..119.5)
    (**−74.1%**), end RSS **460.6 MB** → **92.7 MB** (**−79.9%**), wall time unchanged at **11.1 s** (**0.0%** overhead).
  - Pixel invariance: `crew.px.js` + `character_kit.px.js` **5,455/5,455** frames identical; `traveler.px.js` + `fields.px.js`
    **188/188** frames identical; `mounts` `baseJ.sweep` uses true Lipschitz `1.5` bound for sharper mounted-rider edges.

## Wave 4 — Tactical HD-2D Scenes & VFX

- **Per-primitive depth in `cast()`** (`src/core/vfx.ts`, `src/core/spells.ts`, `src/core/canvas.ts`):
  - `VfxCanvas.setDepth?(z)` and 3D spell primitives (`bolt`, `gring`, `gdisc`, `fissures`, `column`, `waveWall`, `blades`,
    `tornado`/`helix`/`sphere`/`nova`/`blizzard`/`rain`, `drawTrail`, `drawSolid`, `shape`, particles) now pass world depth per
    primitive in `mesh()` scenes (`depth: "part"`, default), so bolts, beams, ground rings, and marks occlude behind closer
    walls and draw in front of farther ones part by part.
  - Pass `cast(sp, { depth: "single" })` to restore legacy single head-depth testing.
- **3D sockets from `turnaround()`** (`src/core/project.ts`):
  - `turnaround(..., { sockets: true })` projects builder `sockets` (`make3d.*`) onto every heading sprite via `c.setSocket()`;
    passing a map `{ name: [x, y, z] }` projects explicit 3D points on both orthographic and perspective views.
  - Under `mirror: "auto"`, symmetric center-plane (`x ≈ 0`) sockets mirror cleanly with `Img.flip("x")`, while off-center
    asymmetric sockets disable east mirroring so every heading projects accurately.
- **Explicit sort tie-breaking & `sortY` in `sort: "y"`** (`src/core/model.ts`, `src/core/project.ts`, `src/core/canvas.ts`):
  - `stamp(..., x, y, { sortY?, z? })` sorts by `sortY ?? y`, breaking ties on equal rows by `z` (default `0`, preserving
    call order).
  - `c.y(y, z, fn)` likewise accepts an optional `z` tie-breaker (`c.y(y, fn)` remains unchanged).

## Verification

- Added unit test coverage across `test/node.test.ts`, `test/normals.test.ts`, `test/rig3d.test.ts`, `test/sdf.test.ts`,
  `test/spells.test.ts`, `test/core.test.ts`, `test/mounts.test.ts`, and `test/kit.test.ts`.
- Verified `npm run build`, `npm run typecheck`, `npm run test:quick`, `test/docs.test.ts`, `test/types.test.ts`,
  `test/workers.test.ts`, and `test/examples.test.ts`.
