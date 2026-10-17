# Motion guides

Walk and run cycles as joint positions, for drawing animations over: `motion("walk.json", { dir,
scale, at })` in an art file gives one direction's frames, `pose(frame, { sides: true })` draws one
as a guide (in a `ref: true` layer), and the numbers can drive parts placed on sockets. The girl's
walk in [`../tropical/girl.px.js`](../tropical/girl.px.js) uses both.

| File | Motion | Frames | Source | License |
|---|---|---|---|---|
| `walk.json` | walk cycle, in place | 8 × 167 ms (1.33 s) | "Walk_Loop" from Quaternius' [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html), as sampled (120 joint samples) in [Training Grounds](https://github.com/ananfang/training-grounds) by Yung-An Fang, commit `ef273b3` | CC0 |
| `run.json` | run cycle, in place | 8 × 104 ms (0.83 s) | "Sprint" (animation 66) from [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app)'s `human-base-animations.glb`, commit `653a969` (Mesh2Motion project contributors), made symmetric: the right side is the left side half a cycle later | CC0 |

The joints were projected for a 2:1 RPG view (orthographic, azimuth 45°, elevation 30°, 76 px per
metre) and sampled at 8 phases for each of 8 directions (N, NE, E, SE, S, SW, W, NW, turning the
figure, not the picture). The figure walks in place: its pelvis keeps its x, and the floor point is
where it stands. These guides carry timing and arcs, not a body: at 16–64 px, scale them down and
keep your character's own proportions (characters.md §10).

## Format

```json
{
  "format": "pxl-motion/1",
  "floor": [64, 132],
  "loop": true,
  "joints": ["head", "neck", "mid_hip", "l_shoulder", "l_elbow", "l_wrist", "r_shoulder", ...],
  "directions": {
    "SW": {
      "ms": [167, 166, ...],
      "contact": [[1, 1], [1, 0], ...],
      "frames": [[[x, y, depth], ...one per joint], ...one per frame]
    }
  }
}
```

`contact` is [left, right] foot on the ground. `depth` is each joint's distance toward the viewer
(larger is nearer): it says which limb is in front. Joint names are `pose()`'s: `l_` / `r_` are the
figure's own left and right.
