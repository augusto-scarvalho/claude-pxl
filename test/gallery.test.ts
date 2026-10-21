// pxl study on two of the gallery's own GIFs, read back to what their source code says: the slowest
// test (two long clips), in a file of its own so it runs beside the others
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("study reads pxl's own gallery back as it was made", async () => {
  // both read at once, each in a process of its own (two long clips: tens of seconds one after the other)
  const run = (gif: string) => promisify(execFile)(process.execPath, ["bin/pxl.js", "study", gif, "--no-out"], { cwd: root, maxBuffer: 1 << 24 }).then((r) => r.stdout);
  const [train, park] = await Promise.all([run("docs/gallery/parallax_train.gif"), run("docs/gallery/park.gif")]);
  // the train: four planes scrolled 320, 640, 1280 and 1920 px over its 192 frames
  const speeds = [...train.matchAll(/at (\d+\.\d+) px\/frame left/g)].map((m) => +m[1]);
  for (const [i, v] of [320, 640, 1280, 1920].entries()) assert.ok(Math.abs(speeds[i] - v / 192) < 0.1, `plane ${i}: ${speeds[i]} for ${v / 192}`);
  assert.match(train, /No lines meet|no third point|parallel in the picture/);
  // the park: perspective({ horizon: 70, fov: 90, yaw: 40 })
  const m = /Two-point perspective: the horizon at row (\d+);.*\(fov ~(\d+)°\)/.exec(park), y = /yaw: (\d+)/.exec(park);
  assert.ok(m && y, park);
  assert.ok(Math.abs(+m![1] - 70) <= 6 && Math.abs(+m![2] - 90) <= 8 && Math.abs(+y![1] - 40) <= 4, `${m![0]} ${y![0]}`);
});
