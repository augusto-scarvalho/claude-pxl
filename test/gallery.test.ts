// pxl study on two of the gallery's own GIFs, read back to what their source code says: the slowest
// test (two long clips), in a file of its own so it runs beside the others. Once it passed, a run with
// pxl's sources, the two GIFs and this test unchanged (an example edited) skips it (passed.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fingerprint, pass, passed, root } from "./passed.ts";

test("study reads pxl's own gallery back as it was made", async (t) => {
  const key = fingerprint(["bin/pxl.js", "test/gallery.test.ts", "docs/gallery/parallax_train.gif", "docs/gallery/park.gif"]);
  if (passed("gallery-passed.txt") === key) return t.skip("nothing it reads changed since it last passed");
  // both read at once, each in a process of its own, and only as much of each clip as tells it (2 s of
  // the train's planes, 1 s of the park's lines): the whole of both took over a minute in the suite
  const run = (gif: string, seconds: number) => promisify(execFile)(process.execPath, ["bin/pxl.js", "study", gif, "--seconds", String(seconds), "--no-out"], { cwd: root, maxBuffer: 1 << 24 }).then((r) => r.stdout);
  const [train, park] = await Promise.all([run("docs/gallery/parallax_train.gif", 2), run("docs/gallery/park.gif", 1)]);
  // the train: four planes scrolled 384, 768, 1536 and 1920 px over its 192 frames, whole px a frame
  const speeds = [...train.matchAll(/at (\d+\.\d+) px\/frame left/g)].map((m) => +m[1]);
  for (const [i, v] of [384, 768, 1536, 1920].entries()) assert.ok(Math.abs(speeds[i] - v / 192) < 0.1, `plane ${i}: ${speeds[i]} for ${v / 192}`);
  assert.doesNotMatch(train, /Uneven:/);
  assert.match(train, /No lines meet|no third point|parallel in the picture/);
  // the park: perspective({ horizon: 70, fov: 90, yaw: 40 })
  const m = /Two-point perspective: the horizon at row (\d+);.*\(fov ~(\d+)°\)/.exec(park), y = /yaw: (\d+)/.exec(park);
  assert.ok(m && y, park);
  assert.ok(Math.abs(+m![1] - 70) <= 6 && Math.abs(+m![2] - 90) <= 8 && Math.abs(+y![1] - 40) <= 4, `${m![0]} ${y![0]}`);
  pass("gallery-passed.txt", key);
});
