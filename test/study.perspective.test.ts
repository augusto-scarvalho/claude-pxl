// study's perspective: lines meeting on one horizon either side, a camera going forward. Apart from
// study.test.ts so the two run side by side (the camera's clips take seconds).
import assert from "node:assert/strict";
import { Img } from "../src/core/image.ts";
import { pack } from "../src/core/color.ts";
import { study } from "../src/core/study.ts";
import { drawing } from "./helpers.ts";
import { whenChanged } from "./passed.ts";

const test = whenChanged("test/study.perspective.test.ts");

test("study: two-point perspective, its lens and its turn, from lines meeting on one horizon either side", () => {
  // a camera turned 40° with a 90° lens: the world's z lines meet at 26,70 and its x lines at 351,70
  const W = 320, H = 180, img = new Img(W, H);
  img.fill(pack(40, 44, 60));
  const ink = pack(230, 220, 160);
  const draw = (x0: number, y0: number, vx: number, vy: number, t1: number) => { for (let t = 0; t <= t1; t += 0.002) { const x = Math.round(x0 + (vx - x0) * t), y = Math.round(y0 + (vy - y0) * t); if (img.inside(x, y)) { img.set(x, y, ink); if (img.inside(x, y + 1)) img.set(x, y + 1, ink); } } };
  for (const [x0, y0] of [[200, 179], [260, 179], [319, 160], [319, 120], [300, 179], [150, 179]]) draw(x0, y0, 26, 70, 0.7);
  for (const [x0, y0] of [[0, 179], [40, 179], [0, 130], [100, 179], [0, 100], [150, 179]]) draw(x0, y0, 351, 70, 0.7);
  const text = study({ name: "two", frames: [img], ms: [100], kind: "test" }).text.join("\n");
  const m = /Two-point perspective: the horizon at row (\d+);.*\(fov ~(\d+)°\)/.exec(text), y = /yaw: (\d+)/.exec(text);
  assert.ok(m && y, text.slice(text.indexOf("PERSPECTIVE")));
  assert.ok(Math.abs(+m![1] - 70) <= 4 && Math.abs(+m![2] - 90) <= 8 && Math.abs(+y![1] - 40) <= 4, `${m![0]} ${y![0]}`);
});

test("study: a camera going forward opens out from a point in view; one off the picture is something else", () => {
  // a pixel texture zoomed 4% a frame about the picture's middle, and about a point above it (what a
  // scroll or things falling or rising together fit): only the first is a camera going forward
  const W = 112, H = 64, tex = drawing(64, 64, 3);
  const zoom = ([px, py]: number[], still = H) => {
    const frames = Array.from({ length: 12 }, (_, f) => {
      const img = new Img(W, H), s = (y: number) => 1.04 ** (y < still ? f : 0), m = (v: number) => ((Math.floor(v) % 64) + 64) % 64;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img.set(x, y, tex.get(m(px + (x - px) / s(y)), m(py + (y - py) / s(y))));
      return img;
    });
    return study({ name: "t", frames, ms: frames.map(() => 80), kind: "test" }).text.join("\n");
  };
  assert.match(zoom([W / 2, H / 2]), /Camera: the scene opens out from 56,32/);
  assert.doesNotMatch(zoom([W / 2, -H]), /Camera:/);
  // opening out only above a point low in the picture, still under it: a waterfall's splash, not the
  // ground going by under a camera
  assert.doesNotMatch(zoom([W / 2, H - 12], H - 12), /Camera:/);
});
